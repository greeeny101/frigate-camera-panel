export type ClientState = "idle" | "connecting" | "live" | "error";

export interface VideoStats {
  /** Incoming video bitrate in kbit/s (0 until two samples have been taken). */
  kbps: number;
  fps: number;
  width: number;
  height: number;
}

/** Extra playout buffer in ms. Raise if audio still breaks up; lower for less delay. */
const JITTER_BUFFER_MS = 300;

interface Options {
  /** Full ws(s):// URL to go2rtc's api/ws endpoint, including ?src=<stream>. */
  url: string;
  video: HTMLVideoElement;
  /** When present, sent to the camera over go2rtc's backchannel (two-way audio). */
  micTrack?: MediaStreamTrack;
  onState: (state: ClientState, detail?: string) => void;
}

/**
 * Minimal WebRTC client for go2rtc.
 * Signalling runs over a WebSocket (through Home Assistant's Frigate proxy);
 * media flows directly between the phone and go2rtc on port 8555.
 */
export class Go2rtcClient {
  private ws?: WebSocket;
  private pc?: RTCPeerConnection;
  private pendingCandidates: string[] = [];
  private haveAnswer = false;
  private closed = false;
  private lastSample?: { bytes: number; frames: number; t: number };

  constructor(private readonly opts: Options) {}

  async connect(): Promise<void> {
    const { url, video, micTrack, onState } = this.opts;
    onState("connecting");

    const pc = new RTCPeerConnection({
      bundlePolicy: "max-bundle",
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.pc = pc;

    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });
    // A send-only audio track is what tells go2rtc to open the camera's backchannel.
    if (micTrack) pc.addTransceiver(micTrack, { direction: "sendonly" });

    const remote = new MediaStream();
    video.srcObject = remote;
    pc.ontrack = (e) => {
      // Ask for a slightly bigger buffer so brief Wi-Fi hiccups don't become audio dropouts.
      // Supported in Chrome (including Android); other browsers ignore it.
      const receiver = e.receiver as RTCRtpReceiver & { jitterBufferTarget?: number | null };
      if ("jitterBufferTarget" in receiver) receiver.jitterBufferTarget = JITTER_BUFFER_MS;
      remote.addTrack(e.track);
    };

    pc.onconnectionstatechange = () => {
      if (this.closed) return;
      if (pc.connectionState === "connected") {
        onState("live");
        void video.play().catch((err: DOMException) => {
          // The browser refused playback with sound (autoplay rules): keep the picture
          // going muted instead of freezing. The panel notices the mute and says so.
          if (err?.name === "NotAllowedError" && !video.muted) {
            video.muted = true;
            void video.play().catch(() => undefined);
          }
        });
      } else if (pc.connectionState === "failed") {
        onState(
          "error",
          "The video connection failed. Away from home, Frigate's WebRTC port 8555 must be reachable and its candidates set.",
        );
      }
    };

    const ws = new WebSocket(url);
    this.ws = ws;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("Timed out reaching the stream.")), 10_000);
      ws.onopen = () => {
        window.clearTimeout(timer);
        resolve();
      };
      ws.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("Couldn't open the stream. Check the stream name and ws_path in the panel config."));
      };
    });
    if (this.closed) return;

    ws.onerror = () => {
      if (!this.closed && pc.connectionState !== "connected") onState("error", "The stream connection dropped.");
    };
    ws.onclose = () => {
      if (!this.closed && pc.connectionState !== "connected") {
        onState("error", "The stream closed before video started.");
      }
    };
    ws.onmessage = (ev) => void this.handleMessage(String(ev.data));

    pc.onicecandidate = (e) => {
      if (e.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "webrtc/candidate", value: e.candidate.candidate }));
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (this.closed) return;
    ws.send(JSON.stringify({ type: "webrtc/offer", value: pc.localDescription?.sdp }));
  }

  private async handleMessage(raw: string): Promise<void> {
    const pc = this.pc;
    if (!pc || this.closed) return;

    let msg: { type: string; value: string };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case "webrtc/answer":
        await pc.setRemoteDescription({ type: "answer", sdp: msg.value });
        this.haveAnswer = true;
        for (const c of this.pendingCandidates.splice(0)) await this.addCandidate(c);
        break;
      case "webrtc/candidate":
        if (this.haveAnswer) await this.addCandidate(msg.value);
        else this.pendingCandidates.push(msg.value);
        break;
      case "error":
        this.opts.onState("error", `go2rtc: ${msg.value}`);
        break;
    }
  }

  private async addCandidate(candidate: string): Promise<void> {
    try {
      await this.pc?.addIceCandidate({ candidate, sdpMid: "0" });
    } catch {
      // A bad candidate shouldn't kill the connection; others usually succeed.
    }
  }

  /** Reads WebRTC stats for the incoming video. Call about once a second. */
  async readStats(): Promise<VideoStats | null> {
    const pc = this.pc;
    if (!pc || this.closed) return null;

    const report = await pc.getStats();
    let inbound: RTCInboundRtpStreamStats | undefined;
    report.forEach((r: RTCStats) => {
      const stat = r as RTCInboundRtpStreamStats;
      if (stat.type === "inbound-rtp" && stat.kind === "video") inbound = stat;
    });
    if (!inbound) return null;

    const t = inbound.timestamp;
    const bytes = inbound.bytesReceived ?? 0;
    const frames = inbound.framesDecoded ?? 0;
    let kbps = 0;
    let fps = inbound.framesPerSecond ?? 0;
    if (this.lastSample && t > this.lastSample.t) {
      const seconds = (t - this.lastSample.t) / 1000;
      kbps = ((bytes - this.lastSample.bytes) * 8) / 1000 / seconds;
      if (!inbound.framesPerSecond) fps = (frames - this.lastSample.frames) / seconds;
    }
    this.lastSample = { bytes, frames, t };
    return { kbps, fps, width: inbound.frameWidth ?? 0, height: inbound.frameHeight ?? 0 };
  }

  disconnect(): void {
    this.closed = true;
    // Stop every outgoing track before closing, so nothing keeps feeding the camera's speaker.
    this.pc?.getSenders().forEach((sender) => {
      sender.track?.stop();
      void sender.replaceTrack(null).catch(() => undefined);
    });
    this.opts.micTrack?.stop(); // releases the mic so the phone's privacy indicator goes away
    try {
      if (this.ws && this.ws.readyState <= WebSocket.OPEN) this.ws.close();
    } catch {
      // already closing
    }
    this.pc?.close();
    if (this.opts.video.srcObject) this.opts.video.srcObject = null;
  }
}
