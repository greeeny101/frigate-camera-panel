import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Go2rtcClient, type ClientState } from "../src/go2rtc-client";

/** go2rtc's signalling WebSocket, driven by the test. */
class FakeSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static last: FakeSocket;
  readyState = FakeSocket.CONNECTING;
  sent: Array<{ type: string; value: string }> = [];
  closed = false;
  onopen?: () => void;
  onerror?: () => void;
  onclose?: () => void;
  onmessage?: (ev: { data: string }) => void;
  constructor(readonly url: string) {
    FakeSocket.last = this;
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.closed = true;
    this.readyState = FakeSocket.CLOSED;
  }
  open() {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }
  receive(msg: unknown) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
}

interface Sender {
  track: { stop: ReturnType<typeof vi.fn> };
  replaceTrack: ReturnType<typeof vi.fn>;
}

/** The browser's WebRTC connection. */
class FakePeer {
  static last: FakePeer;
  connectionState = "new";
  transceivers: Array<{ what: unknown; init: { direction: string } }> = [];
  senders: Sender[] = [];
  candidates: unknown[] = [];
  remote?: { type: string; sdp: string };
  localDescription: { type: string; sdp: string } | null = null;
  closed = false;
  stats: unknown[] = [];
  ontrack?: (e: unknown) => void;
  onconnectionstatechange?: () => void;
  onicecandidate?: (e: unknown) => void;
  constructor() {
    FakePeer.last = this;
  }
  addTransceiver(what: unknown, init: { direction: string }) {
    this.transceivers.push({ what, init });
    if (typeof what !== "string") this.senders.push({ track: what as Sender["track"], replaceTrack: vi.fn(async () => undefined) });
  }
  async createOffer() {
    return { type: "offer", sdp: "v=0 offer" };
  }
  async setLocalDescription(d: { type: string; sdp: string }) {
    this.localDescription = d;
  }
  async setRemoteDescription(d: { type: string; sdp: string }) {
    this.remote = d;
  }
  async addIceCandidate(c: unknown) {
    this.candidates.push(c);
  }
  getSenders() {
    return this.senders;
  }
  async getStats() {
    return new Map(this.stats.map((s, i) => [String(i), s]));
  }
  close() {
    this.closed = true;
  }
  become(state: string) {
    this.connectionState = state;
    this.onconnectionstatechange?.();
  }
}

class FakeMediaStream {
  tracks: unknown[] = [];
  addTrack(t: unknown) {
    this.tracks.push(t);
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

let states: Array<[ClientState, string | undefined]>;
let video: { srcObject: unknown; muted: boolean; play: ReturnType<typeof vi.fn> };

function client(micTrack?: { stop: ReturnType<typeof vi.fn> }) {
  return new Go2rtcClient({
    url: "ws://ha/api/ws?src=doorbell",
    video: video as unknown as HTMLVideoElement,
    micTrack: micTrack as unknown as MediaStreamTrack,
    onState: (s, detail) => states.push([s, detail]),
  });
}

/** Connects and opens the socket, so the offer has gone out. */
async function connected(c = client()) {
  const p = c.connect();
  FakeSocket.last.open();
  await p;
  return c;
}

beforeEach(() => {
  vi.stubGlobal("WebSocket", FakeSocket);
  vi.stubGlobal("RTCPeerConnection", FakePeer);
  vi.stubGlobal("MediaStream", FakeMediaStream);
  states = [];
  video = { srcObject: null, muted: false, play: vi.fn(async () => undefined) };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("connecting", () => {
  it("receives video and audio, and sends the offer once the socket opens", async () => {
    await connected();
    expect(states[0][0]).toBe("connecting");
    expect(FakePeer.last.transceivers.map((t) => [t.what, t.init.direction])).toEqual([
      ["video", "recvonly"],
      ["audio", "recvonly"],
    ]);
    expect(FakeSocket.last.url).toBe("ws://ha/api/ws?src=doorbell");
    expect(FakeSocket.last.sent).toEqual([{ type: "webrtc/offer", value: "v=0 offer" }]);
    expect(video.srcObject).toBeInstanceOf(FakeMediaStream);
  });

  it("adds a send-only track for the microphone, which opens the camera's speaker", async () => {
    const mic = { stop: vi.fn() };
    await connected(client(mic));
    expect(FakePeer.last.transceivers[2]).toEqual({ what: mic, init: { direction: "sendonly" } });
  });

  it("explains when the socket can't open", async () => {
    const p = client().connect();
    FakeSocket.last.onerror?.();
    await expect(p).rejects.toThrow(/Check the stream name/);
  });

  it("gives up after 10 seconds without an answer", async () => {
    vi.useFakeTimers();
    const p = client().connect();
    const outcome = expect(p).rejects.toThrow(/Timed out/);
    await vi.advanceTimersByTimeAsync(10_000);
    await outcome;
  });
});

describe("signalling", () => {
  it("holds go2rtc's candidates until the answer arrives, then adds them", async () => {
    await connected();
    FakeSocket.last.receive({ type: "webrtc/candidate", value: "candidate:1" });
    await flush();
    expect(FakePeer.last.candidates).toEqual([]);
    FakeSocket.last.receive({ type: "webrtc/answer", value: "v=0 answer" });
    await flush();
    expect(FakePeer.last.remote).toEqual({ type: "answer", sdp: "v=0 answer" });
    expect(FakePeer.last.candidates).toEqual([{ candidate: "candidate:1", sdpMid: "0" }]);
    FakeSocket.last.receive({ type: "webrtc/candidate", value: "candidate:2" });
    await flush();
    expect(FakePeer.last.candidates).toHaveLength(2);
  });

  it("sends the phone's own candidates to go2rtc", async () => {
    await connected();
    FakePeer.last.onicecandidate?.({ candidate: { candidate: "candidate:phone" } });
    expect(FakeSocket.last.sent).toContainEqual({ type: "webrtc/candidate", value: "candidate:phone" });
  });

  it("passes on go2rtc's errors and ignores rubbish", async () => {
    await connected();
    FakeSocket.last.onmessage?.({ data: "not json" });
    FakeSocket.last.receive({ type: "error", value: "stream not found" });
    await flush();
    expect(states[states.length - 1]).toEqual(["error", "go2rtc: stream not found"]);
  });
});

describe("the video connection", () => {
  it("is live once connected, and starts playing", async () => {
    await connected();
    FakePeer.last.become("connected");
    expect(states[states.length - 1]?.[0]).toBe("live");
    expect(video.play).toHaveBeenCalled();
  });

  it("keeps the picture going muted when the browser refuses sound", async () => {
    video.play.mockRejectedValueOnce(Object.assign(new Error("no"), { name: "NotAllowedError" }));
    await connected();
    FakePeer.last.become("connected");
    await flush();
    expect(video.muted).toBe(true);
    expect(video.play).toHaveBeenCalledTimes(2);
  });

  it("says why when it fails (port 8555 away from home)", async () => {
    await connected();
    FakePeer.last.become("failed");
    expect(states[states.length - 1]?.[1]).toMatch(/8555/);
  });

  it("reports a socket that closes before the video starts, but not after", async () => {
    await connected();
    FakeSocket.last.onclose?.();
    expect(states[states.length - 1]).toEqual(["error", "The stream closed before video started."]);
    states = [];
    FakePeer.last.become("connected");
    FakeSocket.last.onclose?.();
    expect(states.map((s) => s[0])).toEqual(["live"]);
  });

  it("asks for a bigger playout buffer on incoming tracks", async () => {
    await connected();
    const receiver = { jitterBufferTarget: null as number | null };
    const track = { kind: "audio" };
    FakePeer.last.ontrack?.({ receiver, track });
    expect(receiver.jitterBufferTarget).toBe(300);
    expect((video.srcObject as FakeMediaStream).tracks).toEqual([track]);
  });
});

describe("disconnecting", () => {
  it("stops the mic and everything sent, closes the socket and connection, clears the video, and stays quiet", async () => {
    const mic = { stop: vi.fn() };
    const c = await connected(client(mic));
    const peer = FakePeer.last;
    const socket = FakeSocket.last;
    c.disconnect();
    expect(mic.stop).toHaveBeenCalled();
    expect(peer.senders[0].track.stop).toHaveBeenCalled();
    expect(peer.senders[0].replaceTrack).toHaveBeenCalledWith(null);
    expect(socket.closed).toBe(true);
    expect(peer.closed).toBe(true);
    expect(video.srcObject).toBeNull();
    // Nothing from the old connection gets through once it's closed.
    states = [];
    peer.become("failed");
    socket.receive({ type: "error", value: "late" });
    await flush();
    expect(states).toEqual([]);
  });

  it("doesn't send an offer if disconnected while the socket was opening", async () => {
    const c = client();
    const p = c.connect();
    c.disconnect();
    FakeSocket.last.open();
    await p;
    expect(FakeSocket.last.sent).toEqual([]);
  });
});

describe("stats", () => {
  const inbound = (timestamp: number, bytesReceived: number, framesDecoded: number, framesPerSecond?: number) => ({
    type: "inbound-rtp",
    kind: "video",
    timestamp,
    bytesReceived,
    framesDecoded,
    framesPerSecond,
    frameWidth: 1920,
    frameHeight: 1080,
  });

  it("works out bitrate and frame rate between two samples", async () => {
    const c = await connected();
    FakePeer.last.stats = [inbound(1000, 0, 0)];
    expect(await c.readStats()).toEqual({ kbps: 0, fps: 0, width: 1920, height: 1080 });
    FakePeer.last.stats = [inbound(2000, 250_000, 15)];
    expect(await c.readStats()).toEqual({ kbps: 2000, fps: 15, width: 1920, height: 1080 });
  });

  it("uses the browser's own frame rate when it has one", async () => {
    const c = await connected();
    FakePeer.last.stats = [inbound(1000, 0, 0, 20)];
    expect((await c.readStats())?.fps).toBe(20);
  });

  it("has nothing to report without incoming video", async () => {
    const c = await connected();
    FakePeer.last.stats = [{ type: "candidate-pair" }];
    expect(await c.readStats()).toBeNull();
  });
});
