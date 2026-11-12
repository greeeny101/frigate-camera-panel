import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { property, state, query } from "lit/decorators.js";
import { Go2rtcClient, type ClientState } from "./go2rtc-client";
import { clipUrl, fetchEvents, recordingPath, signPath, signedWsUrl, thumbUrl } from "./frigate";
import type { CameraConfig, CameraPanelConfig, FrigateEvent, HomeAssistant, PanelInfo } from "./types";
import { bitrateText, connectionInfo, dayLabel, isHomeHost, labelText, onConstrainedNetwork, parseRatio, resolutionLabel } from "./util";

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

const statusText: Record<ClientState, string> = {
  idle: "Offline",
  connecting: "Connecting",
  live: "Live",
  error: "Not connected",
};

const iconMic = html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
  <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>`;

const iconSpeaker = html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4 9h3l5-4v14l-5-4H4z" fill="currentColor" />
  <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>`;

const iconSpeakerOff = html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4 9h3l5-4v14l-5-4H4z" fill="currentColor" />
  <path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>`;

const iconCamera = html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
  <circle cx="12" cy="13.5" r="3.5" fill="none" stroke="currentColor" stroke-width="2" />
</svg>`;

const iconExpand = html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

const iconCollapse = html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

const iconPtz = html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

const chevron = (d: string) => html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d=${d} fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;
const iconUp = chevron("M6 15l6-6 6 6");
const iconDown = chevron("M6 9l6 6 6-6");
const iconLeft = chevron("M15 6l-6 6 6 6");
const iconRight = chevron("M9 6l6 6-6 6");
const iconZoomIn = chevron("M12 5v14M5 12h14");
const iconZoomOut = chevron("M5 12h14");

/**
 * A transparent 1×1 image used as the video poster. With a poster set, Android Chrome
 * doesn't draw its big round "play" icon while the stream is connecting.
 */
const BLANK_POSTER = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const iconRefresh = html`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

export class FrigateCameraPanel extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) panel!: PanelInfo<CameraPanelConfig>;
  @property({ type: Boolean }) narrow = false;

  @state() private conn: ClientState = "idle";
  @state() private error = "";
  @state() private muted = true;
  @state() private talking = false;
  @state() private talkError = "";
  @state() private events: FrigateEvent[] = [];
  @state() private eventsError = "";
  @state() private eventsLoaded = false;
  /** Events whose thumbnail no longer exists in Frigate (e.g. past retention). Hidden from the timeline. */
  @state() private brokenThumbs = new Set<string>();
  @state() private openClip?: FrigateEvent;
  @state() private clipSrc = "";
  private clipFallbackUsed = false;
  @state() private selected = 0;
  /** Index of the camera whose doorbell is ringing, or -1. */
  @state() private ringingIdx = -1;
  @state() private zoom = { s: 1, x: 0, y: 0 };
  @state() private fullscreen = false;
  @state() private toast = "";
  @state() private ptzOpen = false;
  /** Kiosk mode (?kiosk in the address): no header, just cameras and controls. */
  @state() private kiosk = false;
  /** Manual HD/SD choice for this session; undefined means automatic. */
  @state() private qualityOverride?: "hd" | "sd";
  /** Bumped when the phone's connection changes, so the quality is re-evaluated. */
  @state() private netTick = 0;
  /** The go2rtc stream the current connection is using. */
  private connectedStream = "";
  /** Talking on the SD stream (`talk_quality: sd`). Cleared by any reconnect without the mic. */
  @state() private talkLow = false;
  private ptzMoving = false;
  @state() private stats?: { res: string; bitrate: string; fps: string };
  @state() private showStatsDetail = true;
  private statsTimer?: number;

  @query("video.live") private video!: HTMLVideoElement;
  @query("section.stage") private stageEl!: HTMLElement;

  // Gesture tracking for pinch-to-zoom, pan and double-tap.
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchStart?: { dist: number; s: number };
  private panStart?: { x: number; y: number; zx: number; zy: number };
  private lastTap = 0;
  /** Start of a possible camera-switching swipe (only when not zoomed). */
  private swipeStart?: { x: number; y: number; t: number };
  /** How far the picture follows the finger during a swipe, in px. */
  @state() private dragX = 0;
  /** True briefly after a swipe ends, so the picture eases back instead of jumping. */
  @state() private settling = false;
  private settleTimer?: number;
  private moved = false;
  private nativeFullscreen = false;
  private toastTimer?: number;

  private client?: Go2rtcClient;
  /** Every connection and microphone ever opened and not yet closed, so none can be orphaned. */
  private liveClients = new Set<Go2rtcClient>();
  private liveMics = new Set<MediaStreamTrack>();
  private started = false;
  private gen = 0; // bumps on every stop so stale connection attempts can't overwrite state
  private refreshTimer?: number;
  /**
   * Off-screen watchdog. Swiping the Companion app away from recent apps can leave the page running in
   * the background with no visibilitychange, pagehide or freeze event, so the stream (and its sound)
   * would carry on. A page on screen gets animation frames; one that's gone gets none.
   */
  private frameId = 0;
  private lastFrame = 0;
  private watchdogTimer?: number;
  private sleeping = false;
  private ringTimer?: number;

  private get cfg() {
    const c = this.panel?.config ?? ({} as CameraPanelConfig);
    const instance = c.frigate_instance ?? "frigate";
    return {
      instance,
      wsPath: c.ws_path ?? `/api/frigate/${instance}/mse/api/ws`,
    };
  }

  private get cameras(): CameraConfig[] {
    const c = this.panel?.config ?? ({} as CameraPanelConfig);
    if (c.cameras?.length) return c.cameras;
    // Single-camera shorthand from the first version of the config.
    return [
      {
        name: c.title ?? "Front door",
        stream: c.stream ?? "",
        camera: c.camera ?? "",
        aspect_ratio: c.aspect_ratio,
        doorbell_entity: c.doorbell_entity,
      },
    ];
  }

  private get cam(): CameraConfig {
    const cams = this.cameras;
    return cams[this.selected] ?? cams[0];
  }

  /**
   * One frame size for every camera: the tallest camera's shape. Wider cameras get
   * black bars above and below, so the controls and timeline never jump when switching.
   */
  private get stageRatio(): number {
    return Math.min(...this.cameras.map((c) => parseRatio(c.aspect_ratio)));
  }

  private get storageKey(): string {
    return `frigate-camera-panel:camera:${this.panel?.url_path ?? "cameras"}`;
  }

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this.onVisibility);
    document.addEventListener("fullscreenchange", this.onFullscreenChange);
    window.addEventListener("pagehide", this.onPageHide);
    document.addEventListener("freeze", this.onPageHide);
    window.addEventListener("location-changed", this.onLocationChanged);
    window.addEventListener("popstate", this.onLocationChanged);
    connectionInfo()?.addEventListener("change", this.onNetworkChange);
    this.refreshTimer = window.setInterval(() => {
      if (this.started && !document.hidden) void this.loadEvents();
    }, 60_000);
    this.lastFrame = performance.now();
    this.frameId = requestAnimationFrame(this.onFrame);
    this.watchdogTimer = window.setInterval(this.checkOnScreen, 2000);
  }

  private onFrame = (t: number): void => {
    this.lastFrame = t;
    if (this.sleeping && this.started && !document.hidden) {
      // Back on screen after the watchdog stopped everything: reconnect, still muted.
      this.sleeping = false;
      void this.start();
    }
    this.frameId = requestAnimationFrame(this.onFrame);
  };

  private checkOnScreen = (): void => {
    if (this.sleeping || !this.started || this.conn === "idle") return;
    if (performance.now() - this.lastFrame > 4000) {
      this.sleeping = true;
      this.silence();
    }
  };

  /** Page closing, reloading or being frozen in the background: release everything immediately. */
  private onPageHide = (): void => this.silence();

  /**
   * Stops every stream, microphone and recording, and turns the sound off. Used whenever the panel
   * leaves the screen. Sound only ever comes back when someone taps the speaker again, so a page woken
   * in the background (Android's app can report "visible" while switching apps) stays silent.
   */
  private silence(): void {
    this.stop();
    this.muted = true;
    const v = this.video;
    if (v) {
      v.muted = true;
      v.pause();
      v.srcObject = null;
    }
    this.renderRoot?.querySelectorAll<HTMLVideoElement>(".sheet video").forEach((clip) => clip.pause());
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("pagehide", this.onPageHide);
    document.removeEventListener("freeze", this.onPageHide);
    window.removeEventListener("location-changed", this.onLocationChanged);
    window.removeEventListener("popstate", this.onLocationChanged);
    document.removeEventListener("visibilitychange", this.onVisibility);
    document.removeEventListener("fullscreenchange", this.onFullscreenChange);
    connectionInfo()?.removeEventListener("change", this.onNetworkChange);
    window.clearInterval(this.refreshTimer);
    window.clearTimeout(this.toastTimer);
    window.clearTimeout(this.settleTimer);
    window.clearTimeout(this.ringTimer);
    window.clearInterval(this.watchdogTimer);
    cancelAnimationFrame(this.frameId);
    this.sleeping = false;
    this.silence();
    this.started = false;
  }

  // Drop the stream when the app goes to the background; reconnect on return, with the sound off.
  private onVisibility = () => {
    if (!this.started) return;
    if (document.hidden) this.silence();
    else void this.start();
  };

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("hass")) this.checkDoorbell(changed.get("hass") as HomeAssistant | undefined);
    if (changed.has("panel")) {
      // Styles switch on this attribute (see :host([theme="ha"]) below).
      this.setAttribute("theme", this.panel?.config?.theme === "ha" ? "ha" : "porch");
    }
  }

  protected updated(): void {
    if (!this.started && this.hass && this.panel) {
      this.started = true;
      // Each phone remembers which camera it was last on, and whether to show bitrate/fps.
      try {
        this.showStatsDetail = localStorage.getItem("frigate-camera-panel:stats") !== "hidden";
        const saved = Number(localStorage.getItem(this.storageKey));
        if (Number.isInteger(saved) && saved >= 0 && saved < this.cameras.length) this.selected = saved;
      } catch {
        // Storage unavailable (private mode); just start on the first camera.
      }
      this.applyUrl(true); // ?camera= in the address wins over the remembered camera
      void this.start();
      void this.loadEvents();
    }
  }

  /**
   * Reads options from the address, so dashboard buttons can open the panel as e.g.
   * /cameras?kiosk=1&camera=front_door. `camera` matches a camera's Frigate name,
   * stream name or display name.
   */
  private applyUrl(initial = false): void {
    if (!location.pathname.startsWith(`/${this.panel?.url_path ?? "cameras"}`)) return;
    const params = new URLSearchParams(location.search);
    const kiosk = params.get("kiosk");
    this.kiosk = kiosk !== null && kiosk !== "0" && kiosk !== "false";

    const want = params.get("camera")?.toLowerCase();
    if (!want) return;
    const idx = this.cameras.findIndex((c) =>
      [c.camera, c.stream, c.name].some((v) => v?.toLowerCase() === want),
    );
    if (idx < 0) return;
    if (initial) this.selected = idx;
    else this.selectCamera(idx);
  }

  private onLocationChanged = (): void => {
    if (this.started) this.applyUrl();
  };

  private checkDoorbell(prev?: HomeAssistant): void {
    if (!this.hass) return;
    this.cameras.forEach((cam, idx) => {
      const id = cam.doorbell_entity;
      if (!id) return;
      const now = this.hass.states[id]?.state;
      const before = prev?.states[id]?.state;
      if (now === "on" && before !== "on") {
        window.clearTimeout(this.ringTimer);
        this.ringingIdx = idx;
        if (!this.started || document.hidden) return;
        if (this.selected !== idx) this.selectCamera(idx);
        else if (this.conn !== "live") void this.start();
        void this.loadEvents();
      } else if (now !== "on" && before === "on") {
        this.ringTimer = window.setTimeout(() => (this.ringingIdx = -1), 30_000);
      }
    });
  }

  private selectCamera(idx: number): void {
    if (idx === this.selected || !this.cameras[idx]) return;
    this.ptzEnd();
    this.ptzOpen = false;
    this.selected = idx;
    this.talkError = "";
    this.events = [];
    this.eventsError = "";
    this.eventsLoaded = false;
    try {
      localStorage.setItem(this.storageKey, String(idx));
    } catch {
      // Not critical.
    }
    // Wait for the render so the stage picks up the new aspect ratio first.
    void this.updateComplete.then(() => {
      this.renderRoot
        .querySelector(".cam[aria-pressed='true']")
        ?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
      void this.start();
      void this.loadEvents();
    });
  }

  private async start(micTrack?: MediaStreamTrack): Promise<boolean> {
    this.stop(micTrack);
    const gen = this.gen;
    this.error = "";

    const stream = this.activeStream;
    this.connectedStream = stream;
    if (!stream) {
      micTrack?.stop();
      this.conn = "error";
      this.error = "Add `stream` (the go2rtc stream name) for this camera in the panel config.";
      return false;
    }

    try {
      const url = await signedWsUrl(this.hass, `${this.cfg.wsPath}?src=${encodeURIComponent(stream)}`);
      if (gen !== this.gen) {
        micTrack?.stop();
        return false;
      }
      const client: Go2rtcClient = new Go2rtcClient({
        url,
        video: this.video,
        micTrack,
        onState: (s, detail) => {
          if (this.client !== client) return;
          this.conn = s;
          if (s === "live" && this.panel?.config?.show_stats === true) this.startStats();
          if (detail) this.error = detail;
          if (s === "error") this.talking = false;
        },
      });
      this.client = client;
      this.liveClients.add(client);
      await client.connect();
      if (gen !== this.gen) {
        // Something restarted the stream while this one was connecting: close it fully.
        client.disconnect();
        this.liveClients.delete(client);
        return false;
      }
      return gen === this.gen;
    } catch (e) {
      micTrack?.stop();
      if (gen !== this.gen) return false;
      this.conn = "error";
      this.error = e instanceof Error ? e.message : String(e);
      return false;
    }
  }

  /** Closes every connection and microphone, except `keepMic` (one just opened for a new talk session). */
  private stop(keepMic?: MediaStreamTrack): void {
    this.ptzEnd(); // never leave the camera moving if the stream stops mid-press
    this.gen++;
    if (!keepMic) this.talkLow = false; // the conversation is over, so back to the usual quality
    for (const c of this.liveClients) c.disconnect();
    this.liveClients.clear();
    this.client = undefined;
    for (const t of this.liveMics) if (t !== keepMic) t.stop();
    this.liveMics = keepMic ? new Set([keepMic]) : new Set();
    this.talking = false;
    this.conn = "idle";
    this.zoom = { s: 1, x: 0, y: 0 };
    this.pointers.clear();
    this.swipeStart = undefined;
    this.dragX = 0;
    window.clearInterval(this.statsTimer);
    this.stats = undefined;
  }

  // ---- Stream quality (HD / SD) ------------------------------------------------

  /** True when the lighter stream should be used. */
  private get lowMode(): boolean {
    void this.netTick; // re-evaluated when the connection changes
    if (this.qualityOverride) return this.qualityOverride === "sd";
    const mode = this.panel?.config?.low_bandwidth ?? "auto";
    if (mode === "always") return true;
    if (mode === "never") return false;
    if (mode === "mobile") return onConstrainedNetwork();
    return onConstrainedNetwork() || !isHomeHost(location.hostname, this.panel?.config?.home_hosts);
  }

  private get activeStream(): string {
    return (this.talkLow || this.lowMode) && this.cam.stream_low ? this.cam.stream_low : this.cam.stream;
  }

  /** Switch automatically if the phone moves between Wi-Fi and mobile data mid-view. */
  private onNetworkChange = (): void => {
    this.netTick++;
    if (!this.started || document.hidden || this.talking) return;
    if (this.activeStream === this.connectedStream) return;
    this.showToast(this.lowMode ? "Switched to SD to save data" : "Switched to HD");
    void this.start();
  };

  private toggleQuality = (): void => {
    this.qualityOverride = this.lowMode ? "hd" : "sd";
    void this.start();
  };

  // ---- Pan / tilt / zoom (via the Frigate integration's frigate.ptz action) ------

  private get ptz(): { entity: string; presets: string[] } | null {
    const p = this.cam.ptz;
    if (!p) return null;
    const cfg = p === true ? {} : p;
    return { entity: cfg.entity ?? `camera.${this.cam.camera}`, presets: cfg.presets ?? [] };
  }

  private ptzCall(action: "move" | "zoom" | "stop" | "preset", argument?: string): void {
    const ptz = this.ptz;
    if (!ptz) return;
    this.hass
      .callService("frigate", "ptz", argument ? { action, argument } : { action }, { entity_id: ptz.entity })
      .catch(() => this.showToast("The camera didn't respond. Check ONVIF is set up in Frigate."));
  }

  /** Press and hold: start moving on press, stop on release. */
  private ptzStart(e: PointerEvent, action: "move" | "zoom", argument: string): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.ptzMoving = true;
    this.ptzCall(action, argument);
  }

  private ptzEnd = (): void => {
    if (!this.ptzMoving) return;
    this.ptzMoving = false;
    this.ptzCall("stop");
  };

  private renderPtz() {
    const ptz = this.ptz;
    if (!ptz || !this.ptzOpen || this.conn !== "live") return nothing;
    const hold = (action: "move" | "zoom", arg: string, label: string, icon: unknown, cls = "") => html`<button
      class=${cls}
      title=${label}
      aria-label=${label}
      @pointerdown=${(e: PointerEvent) => this.ptzStart(e, action, arg)}
      @pointerup=${this.ptzEnd}
      @pointercancel=${this.ptzEnd}
      @lostpointercapture=${this.ptzEnd}
      @contextmenu=${(e: Event) => e.preventDefault()}
    >
      ${icon}
    </button>`;
    return html`
      <div class="ptz">
        ${ptz.presets.length
          ? html`<div class="ptz-presets">
              ${ptz.presets.map(
                (name) => html`<button class="preset" title=${`Go to ${name}`} @click=${() => this.ptzCall("preset", name)}>
                  ${name}
                </button>`,
              )}
            </div>`
          : nothing}
        <div class="ptz-row">
          <div class="ptz-pad">
            ${hold("move", "up", "Tilt up", iconUp, "up")}
            ${hold("move", "left", "Pan left", iconLeft, "left")}
            ${hold("move", "right", "Pan right", iconRight, "right")}
            ${hold("move", "down", "Tilt down", iconDown, "down")}
          </div>
          <div class="ptz-zoom">
            ${hold("zoom", "in", "Zoom in", iconZoomIn)}
            ${hold("zoom", "out", "Zoom out", iconZoomOut)}
          </div>
        </div>
      </div>
    `;
  }

  // ---- Video stats -----------------------------------------------------------

  private startStats(): void {
    window.clearInterval(this.statsTimer);
    const client = this.client;
    this.statsTimer = window.setInterval(async () => {
      if (!client || client !== this.client) return;
      const st = await client.readStats().catch(() => null);
      if (!st || client !== this.client) return;
      const w = st.width || this.video?.videoWidth || 0;
      const h = st.height || this.video?.videoHeight || 0;
      this.stats = {
        res: resolutionLabel(w, h),
        bitrate: bitrateText(st.kbps),
        fps: st.fps > 0 ? `${Math.round(st.fps)} fps` : "",
      };
    }, 1000);
  }

  private toggleStatsDetail = (): void => {
    this.showStatsDetail = !this.showStatsDetail;
    try {
      localStorage.setItem("frigate-camera-panel:stats", this.showStatsDetail ? "shown" : "hidden");
    } catch {
      // Not critical.
    }
  };

  // ---- Zoom and pan ---------------------------------------------------------

  private setZoom(s: number, x: number, y: number): void {
    const scale = clamp(s, 1, 5);
    const rect = this.stageEl?.getBoundingClientRect();
    const maxX = rect ? (rect.width * (scale - 1)) / 2 : 0;
    const maxY = rect ? (rect.height * (scale - 1)) / 2 : 0;
    this.zoom = { s: scale, x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  }

  private onPointerDown = (e: PointerEvent): void => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) this.moved = false;
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: this.zoom.s };
      this.panStart = undefined;
      this.moved = true;
      this.swipeStart = undefined; // a pinch is never a swipe
      this.dragX = 0;
    } else if (this.pointers.size === 1) {
      this.panStart = { x: e.clientX, y: e.clientY, zx: this.zoom.x, zy: this.zoom.y };
      this.swipeStart = this.zoom.s === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : undefined;
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pointers.size === 2 && this.pinchStart) {
      const [a, b] = [...this.pointers.values()];
      const s = this.pinchStart.s * (Math.hypot(a.x - b.x, a.y - b.y) / this.pinchStart.dist);
      this.setZoom(s, this.zoom.x, this.zoom.y);
    } else if (this.pointers.size === 1 && this.panStart) {
      const dx = e.clientX - this.panStart.x;
      const dy = e.clientY - this.panStart.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) this.moved = true;
      if (this.zoom.s > 1) {
        this.setZoom(this.zoom.s, this.panStart.zx + dx, this.panStart.zy + dy);
      } else if (this.swipeStart && Math.abs(dx) > Math.abs(dy)) {
        // Follow the finger; resist at the first and last camera so it's clear there's nothing further.
        const atEdge = (dx > 0 && this.selected === 0) || (dx < 0 && this.selected === this.cameras.length - 1);
        this.dragX = atEdge ? dx * 0.25 : dx * 0.6;
      }
    }
  };

  private onPointerEnd = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchStart = undefined;
    if (this.pointers.size === 1) {
      // One finger lifted mid-pinch: carry on panning with the other.
      const [p] = [...this.pointers.values()];
      this.panStart = { x: p.x, y: p.y, zx: this.zoom.x, zy: this.zoom.y };
      return;
    }
    if (this.pointers.size > 0) return;
    this.panStart = undefined;

    // Swipe left/right (not zoomed): next/previous camera.
    const swipe = this.swipeStart;
    this.swipeStart = undefined;
    if (this.dragX !== 0) {
      this.dragX = 0;
      this.settling = true;
      window.clearTimeout(this.settleTimer);
      this.settleTimer = window.setTimeout(() => (this.settling = false), 220);
    }
    if (swipe && e.type === "pointerup" && this.zoom.s === 1) {
      const dx = e.clientX - swipe.x;
      const dy = e.clientY - swipe.y;
      const quick = performance.now() - swipe.t < 800;
      if (quick && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        this.selectCamera(this.selected + (dx < 0 ? 1 : -1)); // ignored past the first/last camera
        return;
      }
    }

    // Double-tap: zoom into that spot, or back out if already zoomed.
    if (e.type !== "pointerup" || this.moved) return;
    const now = performance.now();
    if (now - this.lastTap > 300) {
      this.lastTap = now;
      return;
    }
    this.lastTap = 0;
    if (this.zoom.s > 1) {
      this.setZoom(1, 0, 0);
      return;
    }
    const r = this.stageEl.getBoundingClientRect();
    const px = e.clientX - (r.left + r.width / 2);
    const py = e.clientY - (r.top + r.height / 2);
    const s = 2.5;
    this.setZoom(s, -(s - 1) * px, -(s - 1) * py);
  };

  // ---- Full screen -----------------------------------------------------------

  private toggleFullscreen = async (): Promise<void> => {
    if (this.fullscreen) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      this.fullscreen = false;
      this.nativeFullscreen = false;
      this.setZoom(1, 0, 0);
      return;
    }
    // The CSS fallback takes over the screen straight away; real full screen
    // (which also hides the phone's status bar) is added on top where allowed.
    this.fullscreen = true;
    try {
      await this.stageEl.requestFullscreen({ navigationUI: "hide" });
      this.nativeFullscreen = true;
    } catch {
      this.nativeFullscreen = false;
    }
  };

  private onFullscreenChange = (): void => {
    // Leaving real full screen with the back gesture also leaves our view.
    if (!document.fullscreenElement && this.nativeFullscreen) {
      this.nativeFullscreen = false;
      this.fullscreen = false;
      this.setZoom(1, 0, 0);
    }
  };

  // ---- Snapshot --------------------------------------------------------------

  private showToast(text: string): void {
    this.toast = text;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toast = ""), 2500);
  }

  private snapshot = async (): Promise<void> => {
    const v = this.video;
    if (!v?.videoWidth) {
      this.showToast("No picture to save yet");
      return;
    }

    // Full camera frame, regardless of any zoom on screen.
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      this.showToast("Snapshot failed");
      return;
    }

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const name = `${this.cam.name.trim().replace(/\s+/g, "-").toLowerCase()}-${stamp}.jpg`;
    const file = new File([blob], name, { type: "image/jpeg" });

    // In the Home Assistant app a plain download often can't be saved, so use the
    // share sheet there (Save to Photos/Files). In a normal browser, download it.
    const inApp = /Home ?Assistant/i.test(navigator.userAgent);
    if (inApp && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: this.cam.name });
      } catch (e) {
        if ((e as DOMException)?.name !== "AbortError") this.showToast("Couldn't share the snapshot");
      }
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    this.showToast("Snapshot saved to Downloads");
  };

  private setMuted(muted: boolean): void {
    this.muted = muted;
    const v = this.video;
    if (!v) return;
    v.muted = muted;
    if (!muted) {
      void v.play().catch((err: DOMException) => {
        if (err?.name !== "NotAllowedError") return; // e.g. interrupted by a reconnect; harmless
        v.muted = true;
        this.muted = true;
        this.showToast("Tap the speaker button to hear sound");
      });
    }
  }

  /** Keep the speaker button honest: it always reflects whether the video is really muted. */
  private onVolumeChange = (e: Event): void => {
    const v = e.currentTarget as HTMLVideoElement;
    if (v.muted !== this.muted) {
      this.muted = v.muted;
      if (v.muted && this.talking) this.showToast("Tap the speaker button to hear them");
    }
  };

  /**
   * Talk reconnects with the mic attached, and stopping reconnects without it,
   * so the microphone (and the phone's privacy indicator) is only on while talking.
   */
  private toggleTalk = async (): Promise<void> => {
    this.talkError = "";

    if (this.talking) {
      await this.start();
      return;
    }

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      this.talkError = "Talking needs a secure (https) connection to Home Assistant.";
      return;
    }

    // Ask for the mic first, while we're still inside the tap, so the prompt appears reliably.
    const track = await this.openMic();
    if (!track) return;

    this.setMuted(false); // you'll want to hear them answer
    // With talk_quality: sd, the conversation uses the lighter stream. If that won't connect, talk in the
    // usual quality instead (a failed start releases the mic, so it's opened again; no second prompt).
    this.talkLow = this.panel?.config?.talk_quality === "sd" && !!this.cam.stream_low;
    let ok = await this.start(track);
    if (!ok && this.talkLow) {
      this.talkLow = false;
      const again = await this.openMic();
      if (!again) {
        void this.start(); // get the picture back, without the mic
        return;
      }
      ok = await this.start(again);
    }
    if (ok) {
      this.talking = true;
      // The reconnect replaced the stream, so make sure sound is really on for the new one.
      this.setMuted(false);
      this.ringingIdx = -1; // you've answered, so clear the ringing banner (it would cover the Mic on pill)
    } else {
      this.talkError = "Talking couldn't start. Check this camera's go2rtc stream has an RTSP source for two-way audio.";
      void this.start();
    }
  };

  /** Opens the microphone, or says why it couldn't. */
  private async openMic(): Promise<MediaStreamTrack | undefined> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      const track = stream.getAudioTracks()[0];
      this.liveMics.add(track);
      return track;
    } catch (e) {
      this.talkError =
        (e as DOMException)?.name === "NotAllowedError"
          ? "Microphone access is blocked. Allow it for Home Assistant in your phone's settings, then tap Talk again."
          : "The microphone couldn't start. Close other apps using it and tap Talk again.";
      return undefined;
    }
  }

  private async loadEvents(): Promise<void> {
    const camera = this.cam.camera;
    if (!camera) return;
    try {
      const labels = this.cam.labels?.map((l) => l.toLowerCase());
      // Fetch extra when filtering, so hidden labels (cats!) don't crowd out the rest.
      const events = await fetchEvents(this.hass, this.cfg.instance, camera, labels?.length ? 150 : 40);
      if (camera !== this.cam.camera) return; // switched cameras while loading
      const shown = labels?.length ? events.filter((ev) => labels.includes(ev.label.toLowerCase())) : events;
      this.events = [...shown].sort((a, b) => b.start_time - a.start_time).slice(0, 40); // newest first
      this.eventsError = "";
    } catch {
      if (camera !== this.cam.camera) return;
      this.eventsError =
        "Activity couldn't load. Check the Frigate integration is installed and `camera` in the panel config matches Frigate.";
    } finally {
      if (camera === this.cam.camera) this.eventsLoaded = true;
    }
  }

  protected render() {
    const cam = this.cam;
    const cams = this.cameras;
    const canTalk = cam.talk !== false;
    // While steering a PTZ camera, the other corner buttons fold away and the
    // pan-and-tilt button slides into the corner.
    const hide = this.ptzOpen && this.ptz ? "concealed" : "";
    return html`
      <div class="app ${this.kiosk ? "kiosk" : ""}">
        ${this.kiosk
          ? nothing
          : html`<header>
              ${this.narrow
                ? html`<ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>`
                : nothing}
              <h1>${cam.name}</h1>
            </header>`}

        ${cams.length > 1
          ? html`<nav class="cams" aria-label="Cameras">
              ${cams.map(
                (c, i) => html`<button
                  class="cam ${this.ringingIdx === i ? "ringing" : ""}"
                  aria-pressed=${String(i === this.selected)}
                  @click=${() => this.selectCamera(i)}
                >
                  ${c.name}
                </button>`,
              )}
            </nav>`
          : nothing}

        <section class="stage ${this.fullscreen ? "full" : ""}" style=${`--ratio: ${this.stageRatio}`}>
          <div
            class="zoomer"
            style=${`touch-action: ${this.zoom.s > 1 ? "none" : "pan-y"}`}
            @pointerdown=${this.onPointerDown}
            @pointermove=${this.onPointerMove}
            @pointerup=${this.onPointerEnd}
            @pointercancel=${this.onPointerEnd}
          >
            <video
              class="live ${this.settling ? "settle" : ""}"
              autoplay
              playsinline
              disablepictureinpicture
              poster=${BLANK_POSTER}
              .muted=${this.muted}
              @volumechange=${this.onVolumeChange}
              style=${`transform: translate(${this.zoom.x + this.dragX}px, ${this.zoom.y}px) scale(${this.zoom.s})`}
            ></video>
          </div>
          ${this.talking
            ? html`<button
                class="mic-pill"
                title="Stop talking"
                aria-label="Microphone on. Tap to stop talking"
                @click=${this.toggleTalk}
              >
                ${iconMic}<span>Mic on</span>
              </button>`
            : nothing}
          ${this.conn === "live"
            ? html`<div class="stage-tools">
                ${this.ptz
                  ? html`<button
                      class="tool ${this.ptzOpen ? "active" : ""}"
                      title=${this.ptzOpen ? "Done with pan and tilt" : "Pan and tilt"}
                      aria-label=${this.ptzOpen ? "Done with pan and tilt" : "Pan and tilt"}
                      aria-pressed=${String(this.ptzOpen)}
                      @click=${() => (this.ptzOpen = !this.ptzOpen)}
                    >
                      ${iconPtz}
                    </button>`
                  : nothing}
                ${this.cam.stream_low
                  ? html`<button
                      class="tool text ${hide}"
                      title=${this.lowMode ? "Switch to HD" : "Switch to SD (saves data)"}
                      aria-label=${this.talkLow
                        ? "Standard quality while talking"
                        : this.lowMode
                          ? "Standard quality. Switch to HD"
                          : "High quality. Switch to SD to save data"}
                      ?disabled=${this.talking}
                      @click=${this.toggleQuality}
                    >
                      ${this.talkLow || this.lowMode ? "SD" : "HD"}
                    </button>`
                  : nothing}
                ${this.fullscreen && canTalk
                  ? html`<button
                      class="tool ${this.talking ? "on" : ""} ${hide}"
                      title=${this.talking ? "Stop talking" : "Talk"}
                      aria-label=${this.talking ? "Stop talking" : "Talk"}
                      aria-pressed=${String(this.talking)}
                      @click=${this.toggleTalk}
                    >
                      ${iconMic}
                    </button>`
                  : nothing}
                ${this.fullscreen
                  ? html`<button
                      class="tool ${hide}"
                      title=${this.muted ? "Turn sound on" : "Turn sound off"}
                      aria-label=${this.muted ? "Turn sound on" : "Turn sound off"}
                      @click=${() => this.setMuted(!this.muted)}
                    >
                      ${this.muted ? iconSpeakerOff : iconSpeaker}
                    </button>`
                  : nothing}
                <button class="tool ${hide}" title="Save snapshot" aria-label="Save snapshot" @click=${this.snapshot}>
                  ${iconCamera}
                </button>
                ${this.fullscreen
                  ? html`<button class="tool ${hide}" title="Reconnect" aria-label="Reconnect" @click=${() => this.start()}>
                      ${iconRefresh}
                    </button>`
                  : nothing}
                <button
                  class="tool ${hide}"
                  title=${this.fullscreen ? "Exit full screen" : "Full screen"}
                  aria-label=${this.fullscreen ? "Exit full screen" : "Full screen"}
                  @click=${this.toggleFullscreen}
                >
                  ${this.fullscreen ? iconCollapse : iconExpand}
                </button>
              </div>`
            : nothing}
          ${this.renderPtz()}
          <div class="top-left">
          <span class="status ${this.conn}" role="status">${statusText[this.conn]}</span>
          ${this.panel?.config?.show_stats === true && this.conn === "live" && this.stats?.res
            ? html`<button
                class="stats"
                title=${this.showStatsDetail ? "Hide bitrate and frame rate" : "Show bitrate and frame rate"}
                aria-label=${this.showStatsDetail ? "Hide bitrate and frame rate" : "Show bitrate and frame rate"}
                @click=${this.toggleStatsDetail}
              >
                <span class="res">${this.stats.res}</span>
                ${this.showStatsDetail && this.stats.bitrate
                  ? html`<span class="detail">${this.stats.bitrate}</span>`
                  : nothing}
                ${this.showStatsDetail && this.stats.fps ? html`<span class="detail">${this.stats.fps}</span>` : nothing}
              </button>`
            : nothing}
          </div>
          ${this.toast ? html`<div class="toast" role="status">${this.toast}</div>` : nothing}
          ${this.ringingIdx === this.selected
            ? html`<div class="ring-banner" role="status">Someone's at the door</div>`
            : nothing}
          ${this.conn === "error"
            ? html`<div class="overlay">
                <p>${this.error}</p>
                <button class="retry" @click=${() => this.start()}>Try again</button>
              </div>`
            : nothing}
        </section>

        <div class="controls">
          <button
            class="round"
            title=${this.muted ? "Turn sound on" : "Turn sound off"}
            aria-label=${this.muted ? "Turn sound on" : "Turn sound off"}
            @click=${() => this.setMuted(!this.muted)}
          >
            ${this.muted ? iconSpeakerOff : iconSpeaker}
          </button>
          <button
            class="talk ${this.talking ? "on" : ""}"
            title=${canTalk ? "" : "This camera can't talk"}
            aria-label=${canTalk ? (this.talking ? "Stop talking" : "Talk") : "Talk (not available on this camera)"}
            aria-pressed=${String(this.talking)}
            ?disabled=${!canTalk || (this.conn !== "live" && !this.talking)}
            @click=${this.toggleTalk}
          >
            ${iconMic}<span>${this.talking ? "Stop talking" : "Talk"}</span>
          </button>
          <button class="round" title="Reconnect" aria-label="Reconnect" @click=${() => this.start()}>
            ${iconRefresh}
          </button>
        </div>
        ${this.talkError ? html`<p class="talk-error" role="alert">${this.talkError}</p>` : nothing}

        <section class="activity">
          <h2>Activity</h2>
          ${this.renderEvents()}
        </section>
      </div>
      ${this.openClip ? this.renderClip(this.openClip) : nothing}
    `;
  }

  private renderEvents() {
    if (this.eventsError) return html`<p class="empty">${this.eventsError}</p>`;
    if (!this.eventsLoaded) return html`<p class="empty">Loading…</p>`;
    const visible = this.events.filter((ev) => !this.brokenThumbs.has(ev.id));
    if (!visible.length) {
      return html`<p class="empty">Nothing yet. People and vehicles Frigate spots here will appear in the timeline.</p>`;
    }

    // Newest on the left; the first tile of each day carries a day badge.
    const tiles = visible.map((ev, i) => {
      const day = dayLabel(ev.start_time);
      const prevDay = i > 0 ? dayLabel(visible[i - 1].start_time) : "";
      return { ev, day: day !== prevDay ? day : "" };
    });

    return html`
      <div class="timeline" role="list" aria-label="Activity timeline">
        ${tiles.map(
          ({ ev, day }) => html`<button
            class="tile ${day ? "new-day" : ""}"
            role="listitem"
            ?disabled=${!ev.has_clip}
            aria-label=${`${labelText(ev)}, ${dayLabel(ev.start_time)} at ${timeFmt.format(new Date(ev.start_time * 1000))}`}
            @click=${() => this.openEvent(ev)}
          >
            <span class="thumb">
              <img
                src=${thumbUrl(this.cfg.instance, ev.id)}
                alt=""
                loading="lazy"
                @error=${() => (this.brokenThumbs = new Set([...this.brokenThumbs, ev.id]))}
              />
              ${day ? html`<span class="day-badge">${day}</span>` : nothing}
            </span>
            <span class="meta">
              <span class="what">${labelText(ev)}</span>
              <time>${timeFmt.format(new Date(ev.start_time * 1000))}</time>
            </span>
          </button>`,
        )}
      </div>
    `;
  }

  // ---- Clip playback ---------------------------------------------------------

  /** Time window to play: padded around the event, and never shorter than the minimum. */
  private clipWindow(ev: FrigateEvent): { start: number; end: number } {
    const pad = this.panel?.config?.clip_padding ?? {};
    const before = pad.before ?? 3;
    const after = pad.after ?? 3;
    const min = pad.min ?? 6;
    const now = Date.now() / 1000;

    let start = ev.start_time - before;
    let end = (ev.end_time ?? now) + after;
    const short = min - (end - start);
    if (short > 0) {
      start -= short / 2;
      end += short / 2;
    }
    end = Math.min(end, now); // can't play the future
    return { start: Math.floor(start), end: Math.ceil(end) };
  }

  private openEvent(ev: FrigateEvent): void {
    this.openClip = ev;
    this.clipSrc = "";
    this.clipFallbackUsed = false;
    void this.prepareClip(ev);
  }

  private async prepareClip(ev: FrigateEvent): Promise<void> {
    try {
      const { start, end } = this.clipWindow(ev);
      const signed = await signPath(this.hass, recordingPath(this.cfg.instance, ev.camera, start, end));
      if (this.openClip?.id === ev.id) this.clipSrc = signed;
    } catch {
      if (this.openClip?.id === ev.id) this.useEventClip(ev);
    }
  }

  /** Falls back to Frigate's own (shorter) event clip if the padded recording won't load. */
  private useEventClip(ev: FrigateEvent): void {
    this.clipFallbackUsed = true;
    this.clipSrc = clipUrl(this.cfg.instance, ev.camera, ev.id);
  }

  private onClipError = (): void => {
    if (this.openClip && !this.clipFallbackUsed) this.useEventClip(this.openClip);
  };

  private closeClip = (): void => {
    this.openClip = undefined;
    this.clipSrc = "";
  };

  private renderClip(ev: FrigateEvent) {
    return html`
      <div class="sheet-backdrop" @click=${this.closeClip}>
        <div class="sheet" role="dialog" aria-label="Recording" @click=${(e: Event) => e.stopPropagation()}>
          <div class="sheet-head">
            <span>${labelText(ev)}, ${timeFmt.format(new Date(ev.start_time * 1000))}</span>
            <button class="close" @click=${this.closeClip}>Close</button>
          </div>
          ${this.clipSrc
            ? html`<video
                src=${this.clipSrc}
                poster=${BLANK_POSTER}
                controls
                autoplay
                playsinline
                @error=${this.onClipError}
              ></video>`
            : html`<div class="clip-loading">Loading…</div>`}
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      --dusk: #1b2431;
      --slate: #273345;
      --slate-2: #33415a;
      --mist: #e9eef4;
      --haze: #93a1b4;
      --porch: #f5b83d;
      --on-porch: #2a1d00; /* text on the amber accent */
      --signal: #e5534b;
      --error-text: #ffb4ae;
      --stage-edge: rgb(255 255 255 / 0.08);
      --stage-shadow: 0 0 0 0 transparent;
      --on-video: #e9eef4;
      --on-video-muted: #b5c0cf;
      --on-video-edge: 0 0 0 1px rgb(255 255 255 / 0.28), 0 1px 4px rgb(0 0 0 / 0.35);
      display: block;
      /* Home Assistant's panel container has no set height, so 100% would stop at the content. */
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--dusk);
      color: var(--mist);
      font-family: ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      -webkit-tap-highlight-color: transparent;
    }
    /* Follow the user's Home Assistant theme. Things drawn over the video
       (pills, buttons, toasts) stay dark on purpose so they read on any picture. */
    :host([theme="ha"]) {
      --dusk: var(--primary-background-color, #111111);
      --slate: var(--secondary-background-color, #282828);
      --slate-2: var(--divider-color, rgba(127, 127, 127, 0.3));
      --mist: var(--primary-text-color, #e1e1e1);
      --haze: var(--secondary-text-color, #9b9b9b);
      --porch: var(--accent-color, #ff9800);
      --on-porch: var(--text-accent-color, var(--text-primary-color, #ffffff));
      --signal: var(--error-color, #db4437);
      --error-text: var(--error-color, #db4437);
      --stage-edge: var(--divider-color, rgba(127, 127, 127, 0.25));
      --stage-shadow: 0 2px 8px rgb(0 0 0 / 0.12);
      font-family: var(--ha-font-family-body, Roboto, system-ui, sans-serif);
    }
    .app {
      max-width: 560px;
      margin: 0 auto;
      padding-bottom: calc(24px + env(safe-area-inset-bottom));
    }
    .app.kiosk {
      /* No header, so the camera buttons need the status-bar clearance instead */
      padding-top: calc(12px + env(safe-area-inset-top));
    }
    header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: calc(12px + env(safe-area-inset-top)) 16px 12px;
    }
    h1 {
      flex: 1;
      margin: 0;
      font-size: 1.375rem;
      font-weight: 650;
      letter-spacing: -0.01em;
    }
    /* Top-left of the video: connection status, then the optional stats pill */
    .top-left {
      position: absolute;
      top: 10px;
      left: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .stage.full .top-left {
      top: calc(14px + env(safe-area-inset-top));
      left: calc(14px + env(safe-area-inset-left));
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px 4px 8px;
      border-radius: 999px;
      background: rgb(27 36 49 / 0.75);
      color: var(--on-video-muted);
      box-shadow: var(--on-video-edge);
      font-size: 0.75rem;
      font-weight: 600;
      -webkit-backdrop-filter: blur(6px);
      backdrop-filter: blur(6px);
    }
    .status::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--on-video-muted);
    }
    .status.live {
      color: var(--on-video);
    }
    .status.live::before {
      background: var(--signal);
    }
    @media (prefers-reduced-motion: no-preference) {
      .status.connecting::before {
        animation: status-pulse 1s ease-in-out infinite;
      }
    }
    @keyframes status-pulse {
      50% {
        opacity: 0.3;
      }
    }

    .cams {
      display: flex;
      gap: 8px;
      padding: 0 16px 12px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .cams::-webkit-scrollbar {
      display: none;
    }
    .cam {
      flex: none;
      padding: 8px 14px;
      border-radius: 999px;
      background: var(--slate);
      color: var(--haze);
      font-size: 0.9375rem;
      font-weight: 600;
    }
    .cam[aria-pressed="true"] {
      background: var(--mist);
      color: var(--dusk);
    }
    .cam.ringing {
      box-shadow: inset 0 0 0 2px var(--porch);
    }

    .stage {
      position: relative;
      aspect-ratio: var(--ratio, 4/3);
      background: #000;
      overflow: hidden;
      /* A fine outline, so a bright sky doesn't melt into a light page */
      box-shadow: 0 0 0 1px var(--stage-edge), var(--stage-shadow);
    }
    @media (min-width: 560px) {
      .stage {
        margin: 0 16px;
        border-radius: 20px;
      }
    }
    /* Belt and braces: hide the browser's own start-playback icon on the live view */
    video.live::-webkit-media-controls,
    video.live::-webkit-media-controls-start-playback-button,
    video.live::-webkit-media-controls-overlay-play-button {
      display: none !important;
      -webkit-appearance: none;
    }
    .stage video {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .zoomer {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }
    .zoomer video {
      transform-origin: center;
      will-change: transform;
    }
    .zoomer video.settle {
      transition: transform 0.2s ease-out;
    }
    .stage.full {
      position: fixed;
      inset: 0;
      z-index: 20;
      width: 100%;
      height: 100%;
      margin: 0;
      border-radius: 0;
      aspect-ratio: auto;
      box-shadow: none;
    }
    .stage-tools {
      position: absolute;
      right: 10px;
      bottom: 10px;
      display: flex;
      gap: 8px;
    }
    .stage.full .stage-tools {
      right: calc(14px + env(safe-area-inset-right));
      bottom: calc(14px + env(safe-area-inset-bottom));
    }
    .tool {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgb(27 36 49 / 0.7);
      color: var(--on-video);
      box-shadow: var(--on-video-edge);
      -webkit-backdrop-filter: blur(6px);
      backdrop-filter: blur(6px);
    }
    .tool.text {
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.03em;
    }
    .tool:disabled {
      opacity: 0.5;
    }
    .tool {
      transition:
        width 0.22s ease,
        margin 0.22s ease,
        opacity 0.15s ease;
    }
    .tool.concealed {
      width: 0;
      margin-left: -8px; /* cancel the row gap, so nothing is left behind */
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .tool {
        transition: none;
      }
    }
    .tool.active {
      background: var(--on-video);
      color: #1b2431;
    }
    .ptz {
      position: absolute;
      left: 10px;
      bottom: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 60%;
    }
    .stage.full .ptz {
      left: calc(14px + env(safe-area-inset-left));
      bottom: calc(14px + env(safe-area-inset-bottom));
    }
    .ptz-row {
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }
    .ptz-pad {
      display: grid;
      grid-template-columns: repeat(3, 40px);
      grid-template-rows: repeat(3, 40px);
      gap: 4px;
    }
    .ptz-pad .up {
      grid-column: 2;
      grid-row: 1;
    }
    .ptz-pad .left {
      grid-column: 1;
      grid-row: 2;
    }
    .ptz-pad .right {
      grid-column: 3;
      grid-row: 2;
    }
    .ptz-pad .down {
      grid-column: 2;
      grid-row: 3;
    }
    .ptz-zoom {
      display: grid;
      gap: 4px;
    }
    .ptz button {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgb(27 36 49 / 0.7);
      color: var(--on-video);
      box-shadow: var(--on-video-edge);
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
      -webkit-backdrop-filter: blur(6px);
      backdrop-filter: blur(6px);
    }
    .ptz button:active {
      background: var(--on-video);
      color: #1b2431;
    }
    .ptz button svg {
      width: 20px;
      height: 20px;
    }
    .ptz-presets {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .ptz-presets::-webkit-scrollbar {
      display: none;
    }
    .ptz .preset {
      flex: none;
      width: auto;
      height: 30px;
      padding: 0 12px;
      border-radius: 999px;
      font-size: 0.8125rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .tool.on {
      background: var(--porch);
      color: var(--on-porch);
    }
    .tool svg {
      width: 20px;
      height: 20px;
    }
    .mic-pill {
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 11px 4px 8px;
      border-radius: 999px;
      background: var(--porch);
      color: var(--on-porch);
      font-size: 0.75rem;
      font-weight: 700;
      box-shadow: 0 0 16px color-mix(in srgb, var(--porch) 50%, transparent);
    }
    .mic-pill svg {
      width: 14px;
      height: 14px;
    }
    @media (prefers-reduced-motion: no-preference) {
      .mic-pill svg {
        animation: mic-pulse 1.6s ease-in-out infinite;
      }
    }
    @keyframes mic-pulse {
      50% {
        opacity: 0.5;
      }
    }
    .stage.full .mic-pill {
      top: calc(14px + env(safe-area-inset-top));
      right: calc(14px + env(safe-area-inset-right));
    }
    .stats {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgb(27 36 49 / 0.75);
      color: var(--on-video);
      box-shadow: var(--on-video-edge);
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
      -webkit-backdrop-filter: blur(6px);
      backdrop-filter: blur(6px);
    }
    .stats .res {
      font-weight: 700;
    }
    .stats .detail {
      color: var(--on-video-muted);
    }
    .toast {
      position: absolute;
      left: 50%;
      bottom: 16px;
      transform: translateX(-50%);
      padding: 6px 12px;
      border-radius: 999px;
      background: rgb(27 36 49 / 0.9);
      color: var(--on-video);
      box-shadow: var(--on-video-edge);
      font-size: 0.8125rem;
      white-space: nowrap;
    }
    .overlay {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      justify-items: center;
      gap: 12px;
      padding: 24px;
      text-align: center;
      background: rgb(27 36 49 / 0.72);
      color: var(--on-video);
    }
    .overlay p {
      margin: 0;
      max-width: 32ch;
      line-height: 1.4;
    }
    .ring-banner {
      position: absolute;
      top: 12px;
      left: 12px;
      right: 12px;
      padding: 10px 14px;
      border-radius: 14px;
      background: var(--porch);
      color: var(--on-porch);
      font-weight: 650;
    }

    button {
      font: inherit;
      color: inherit;
      border: 0;
      cursor: pointer;
    }
    button:focus-visible {
      outline: 3px solid var(--porch);
      outline-offset: 3px;
    }
    .controls {
      display: grid;
      grid-template-columns: 56px 1fr 56px;
      align-items: center;
      gap: 16px;
      padding: 20px 16px 8px;
    }
    .round {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--slate);
    }
    .round svg {
      width: 24px;
      height: 24px;
    }
    .talk {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      height: 72px;
      border-radius: 36px;
      background: var(--slate);
      color: var(--porch);
      font-size: 1.125rem;
      font-weight: 650;
      transition: background 0.2s, color 0.2s, box-shadow 0.2s;
    }
    .talk svg {
      width: 28px;
      height: 28px;
    }
    .talk.on {
      background: var(--porch);
      color: var(--on-porch);
      box-shadow:
        0 0 0 8px color-mix(in srgb, var(--porch) 18%, transparent),
        0 0 32px color-mix(in srgb, var(--porch) 45%, transparent);
    }
    .talk:disabled {
      opacity: 0.45;
      cursor: default;
    }
    @media (prefers-reduced-motion: no-preference) {
      .talk.on {
        animation: glow 2.4s ease-in-out infinite;
      }
    }
    @keyframes glow {
      50% {
        box-shadow:
          0 0 0 14px color-mix(in srgb, var(--porch) 10%, transparent),
          0 0 44px color-mix(in srgb, var(--porch) 55%, transparent);
      }
    }
    .retry {
      padding: 10px 18px;
      border-radius: 999px;
      background: var(--mist);
      color: var(--dusk);
      font-weight: 600;
    }
    .talk-error {
      margin: 4px 16px 0;
      color: var(--error-text);
      font-size: 0.875rem;
      text-align: center;
    }

    .activity {
      padding: 16px;
    }
    h2 {
      margin: 8px 0 4px;
      font-size: 1.0625rem;
      font-weight: 650;
    }
    .timeline {
      display: flex;
      gap: 10px;
      margin: 0 -16px;
      padding: 4px 16px 8px;
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scroll-snap-type: x proximity;
      scroll-padding-left: 16px;
      scrollbar-width: none;
    }
    .timeline::-webkit-scrollbar {
      display: none;
    }
    .tile {
      flex: none;
      display: grid;
      gap: 6px;
      width: 148px;
      padding: 0;
      background: transparent;
      text-align: left;
      scroll-snap-align: start;
    }
    .tile img {
      display: block;
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      border-radius: 12px;
      background: var(--slate);
      transition: transform 0.15s;
    }
    .tile:active img {
      transform: scale(0.97);
    }
    .tile:disabled {
      cursor: default;
    }
    .tile:disabled img {
      opacity: 0.55;
    }
    .meta {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 6px;
      padding: 0 2px;
      font-size: 0.875rem;
    }
    .what {
      overflow: hidden;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    time {
      flex: none;
      color: var(--haze);
      font-size: 0.8125rem;
      font-variant-numeric: tabular-nums;
    }
    .thumb {
      position: relative;
      display: block;
    }
    .day-badge {
      position: absolute;
      top: 6px;
      left: 6px;
      padding: 3px 9px;
      border-radius: 999px;
      background: rgb(27 36 49 / 0.85);
      color: var(--on-video);
      box-shadow: var(--on-video-edge);
      font-size: 0.75rem;
      font-weight: 650;
      white-space: nowrap;
    }
    /* A little extra space where a new day starts */
    .tile.new-day:not(:first-child) {
      margin-left: 12px;
    }
    .empty {
      max-width: 40ch;
      color: var(--haze);
      line-height: 1.45;
    }

    .sheet-backdrop {
      position: fixed;
      inset: 0;
      z-index: 10;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      background: rgb(0 0 0 / 0.6);
    }
    .sheet {
      width: 100%;
      max-width: 560px;
      padding: 12px 12px calc(16px + env(safe-area-inset-bottom));
      border-radius: 20px 20px 0 0;
      background: var(--slate);
    }
    @media (prefers-reduced-motion: no-preference) {
      .sheet {
        animation: rise 0.22s ease-out;
      }
    }
    @keyframes rise {
      from {
        transform: translateY(24px);
        opacity: 0.6;
      }
    }
    .sheet-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 4px 4px 12px;
      font-weight: 600;
    }
    .close {
      padding: 8px 14px;
      border-radius: 999px;
      background: var(--slate-2);
    }
    .clip-loading {
      display: grid;
      place-items: center;
      aspect-ratio: 16 / 9;
      border-radius: 12px;
      background: #000;
      color: var(--haze);
    }
    .sheet video {
      display: block;
      width: 100%;
      border-radius: 12px;
      background: #000;
    }
  `;
}

// Home Assistant can load a new version of the panel into a page that already has the old one
// (e.g. after a restart with a bumped ?v=). Defining a name twice throws, so only define it once;
// the new version takes over on the next full reload.
if (!customElements.get("frigate-camera-panel")) customElements.define("frigate-camera-panel", FrigateCameraPanel);

declare global {
  interface HTMLElementTagNameMap {
    "frigate-camera-panel": FrigateCameraPanel;
  }
}
