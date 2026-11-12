import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CameraConfig, CameraPanelConfig, FrigateEvent, HomeAssistant, PanelInfo } from "../src/types";

// The video connection is replaced by a fake that records what the panel asks of it.
vi.mock("../src/go2rtc-client", () => {
  class FakeClient {
    static all: FakeClient[] = [];
    /** When set, connect() waits until `finish` is called. */
    static hold = false;
    /** go2rtc streams that won't connect. */
    static failing = new Set<string>();
    disconnected = false;
    finish = () => undefined as void;
    constructor(readonly opts: { url: string; micTrack?: MediaStreamTrack; onState: (s: string, d?: string) => void }) {
      FakeClient.all.push(this);
    }
    connect = vi.fn(async () => {
      this.opts.onState("connecting");
      if (FakeClient.failing.has(new URL(this.opts.url).searchParams.get("src") ?? "")) throw new Error("Couldn't open the stream.");
      if (FakeClient.hold) await new Promise<void>((r) => (this.finish = r));
    });
    disconnect = vi.fn(() => {
      this.disconnected = true;
    });
    readStats = async () => null;
  }
  return { Go2rtcClient: FakeClient };
});

import { FrigateCameraPanel } from "../src/frigate-camera-panel";
import { Go2rtcClient } from "../src/go2rtc-client";

interface FakeClient {
  opts: { url: string; micTrack?: MediaStreamTrack; onState: (s: string, d?: string) => void };
  disconnected: boolean;
  finish: () => void;
}
const Clients = Go2rtcClient as unknown as { all: FakeClient[]; hold: boolean; failing: Set<string> };
const lastClient = () => Clients.all[Clients.all.length - 1];
const openClients = () => Clients.all.filter((c) => !c.disconnected);
/** The go2rtc stream a client was opened for. */
const streamOf = (c: FakeClient) => new URL(c.opts.url).searchParams.get("src");

/** The panel's private state and methods, which the tests look at directly. */
interface Internals {
  selected: number;
  kiosk: boolean;
  muted: boolean;
  conn: string;
  error: string;
  talking: boolean;
  talkError: string;
  ringingIdx: number;
  events: FrigateEvent[];
  eventsError: string;
  sleeping: boolean;
  video: HTMLVideoElement;
  cameras: CameraConfig[];
  start(): Promise<boolean>;
  setMuted(muted: boolean): void;
  checkOnScreen(): void;
  clipWindow(ev: FrigateEvent): { start: number; end: number };
  toggleTalk(): Promise<void>;
}

const CAMERAS: CameraConfig[] = [
  { name: "Front door", stream: "doorbell", stream_low: "doorbell_sub", camera: "doorbell", doorbell_entity: "binary_sensor.front_door_visitor" },
  { name: "Driveway", stream: "driveway", stream_low: "driveway_sub", camera: "driveway" },
  { name: "Kitchen", stream: "kitchen_cam", camera: "kitchen_cam", labels: ["person", "car"] },
];

const event = (id: string, label: string, start_time: number, end_time: number | null = start_time + 5): FrigateEvent => ({
  id,
  camera: "doorbell",
  label,
  start_time,
  end_time,
  has_clip: true,
  has_snapshot: true,
});

let events: FrigateEvent[];
let eventsFail: boolean;
let callWS: ReturnType<typeof vi.fn>;
let hass: HomeAssistant;
let frames: Array<(t: number) => void>;
let now: number;
let hidden: boolean;
let el: FrigateCameraPanel;
const panel = () => el as unknown as Internals;
const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
};

function makeHass(states: Record<string, string> = {}): HomeAssistant {
  return {
    states: Object.fromEntries(
      Object.entries(states).map(([id, state]) => [id, { entity_id: id, state, attributes: {}, last_changed: "" }]),
    ),
    callWS: callWS as unknown as HomeAssistant["callWS"],
    callService: vi.fn(async () => undefined),
  };
}

async function mount(config: Partial<CameraPanelConfig> = {}, address = "/cameras"): Promise<FrigateCameraPanel> {
  history.replaceState(null, "", address);
  el = document.createElement("frigate-camera-panel") as FrigateCameraPanel;
  el.hass = hass;
  el.panel = { url_path: "cameras", title: null, config: { cameras: CAMERAS, ...config } } as PanelInfo<CameraPanelConfig>;
  document.body.appendChild(el);
  await flush();
  // happy-dom's video can't play; a resolved play() stands in for it.
  const v = panel().video;
  if (v) {
    v.play = vi.fn(async () => undefined);
    v.pause = vi.fn();
  }
  return el;
}

/** The current connection reaches the camera and the sound is turned on, as someone watching would. */
async function watchingWithSound(): Promise<void> {
  lastClient().opts.onState("live");
  panel().setMuted(false);
  await flush();
  expect(panel().muted).toBe(false);
}

/** Everything that plays sound or uses the mic is stopped. */
function expectSilent(): void {
  expect(openClients()).toEqual([]);
  expect(panel().muted).toBe(true);
  expect(panel().video.muted).toBe(true);
  expect(panel().video.srcObject ?? null).toBeNull();
}

beforeEach(() => {
  Clients.all = [];
  Clients.hold = false;
  Clients.failing = new Set();
  events = [event("a", "person", 1000), event("b", "cat", 3000), event("c", "car", 2000)];
  eventsFail = false;
  callWS = vi.fn(async (msg: Record<string, unknown>) => {
    if (msg.type === "auth/sign_path") return { path: `${msg.path}&authSig=t` };
    if (msg.type === "frigate/events/get") {
      if (eventsFail) throw new Error("unknown command");
      return events;
    }
    throw new Error(`unexpected ${String(msg.type)}`);
  });
  hass = makeHass();
  frames = [];
  now = 0;
  hidden = false;
  vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  vi.spyOn(performance, "now").mockImplementation(() => now);
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  localStorage.clear();
});

afterEach(() => {
  el?.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("opening", () => {
  it("connects to the first camera's stream through Home Assistant", async () => {
    await mount();
    expect(Clients.all).toHaveLength(1);
    expect(lastClient().opts.url).toMatch(/^ws:\/\/192\.168\.1\.20:8123\/api\/frigate\/frigate\/mse\/api\/ws\?src=doorbell&authSig=t$/);
    expect(panel().muted).toBe(true);
  });

  it("supports the single-camera config from the first version", async () => {
    await mount({ cameras: undefined, title: "Porch", stream: "porch", camera: "porch" });
    expect(panel().cameras).toEqual([expect.objectContaining({ name: "Porch", stream: "porch", camera: "porch" })]);
    expect(streamOf(lastClient())).toBe("porch");
  });

  it("explains a camera with no stream instead of connecting", async () => {
    await mount({ cameras: [{ name: "Shed", stream: "", camera: "shed" }] });
    expect(Clients.all).toHaveLength(0);
    expect(panel().conn).toBe("error");
    expect(panel().error).toMatch(/Add `stream`/);
  });

  it("follows the theme setting", async () => {
    await mount();
    expect(el.getAttribute("theme")).toBe("porch");
    el.remove();
    await mount({ theme: "ha" });
    expect(el.getAttribute("theme")).toBe("ha");
  });

  it("can be loaded twice (a new ?v= in an open page) without breaking", async () => {
    vi.resetModules();
    await expect(import("../src/frigate-camera-panel")).resolves.toBeDefined();
    expect(customElements.get("frigate-camera-panel")).toBe(FrigateCameraPanel);
  });
});

describe("links from the dashboard", () => {
  it("opens the camera named in ?camera=, by Frigate name, stream or display name, in any case", async () => {
    await mount({}, "/cameras?camera=DRIVEWAY");
    expect(panel().selected).toBe(1);
    expect(streamOf(lastClient())).toBe("driveway");
    el.remove();
    await mount({}, "/cameras?camera=kitchen");
    expect(panel().selected).toBe(2);
  });

  it("ignores a camera it doesn't know", async () => {
    await mount({}, "/cameras?camera=garage");
    expect(panel().selected).toBe(0);
  });

  it("hides the header with ?kiosk=1, but not ?kiosk=0", async () => {
    await mount({}, "/cameras?kiosk=1");
    expect(panel().kiosk).toBe(true);
    el.remove();
    await mount({}, "/cameras?kiosk=0");
    expect(panel().kiosk).toBe(false);
  });

  it("remembers the last camera on this phone, but a link wins", async () => {
    localStorage.setItem("frigate-camera-panel:camera:cameras", "2");
    await mount();
    expect(panel().selected).toBe(2);
    el.remove();
    await mount({}, "/cameras?camera=doorbell");
    expect(panel().selected).toBe(0);
  });

  it("switches camera when a link is followed while the panel is open", async () => {
    await mount();
    history.pushState(null, "", "/cameras?camera=driveway");
    window.dispatchEvent(new Event("location-changed"));
    await flush();
    expect(panel().selected).toBe(1);
    expect(openClients().map(streamOf)).toEqual(["driveway"]);
  });
});

describe("sound stops when the panel leaves the screen", () => {
  it("when the page is hidden, and reconnects muted when it's back", async () => {
    await mount();
    await watchingWithSound();
    hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    expectSilent();
    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    await flush();
    expect(openClients()).toHaveLength(1);
    expect(panel().muted).toBe(true);
  });

  it.each([
    ["pagehide", () => window.dispatchEvent(new Event("pagehide"))],
    ["freeze", () => document.dispatchEvent(new Event("freeze"))],
  ])("on %s", async (_, fire) => {
    await mount();
    await watchingWithSound();
    fire();
    expectSilent();
  });

  it("when the app is swiped away and the page gets no more frames (the 9 Oct fix)", async () => {
    await mount();
    await watchingWithSound();
    // Swiped away: no events at all, and no animation frames for over 4 seconds.
    now = 5000;
    panel().checkOnScreen();
    expectSilent();
    expect(panel().sleeping).toBe(true);
    // Back on screen: frames resume, and it reconnects with the sound still off.
    frames[frames.length - 1]?.(now);
    await flush();
    expect(openClients()).toHaveLength(1);
    expect(panel().muted).toBe(true);
    expect(panel().sleeping).toBe(false);
  });

  it("but not while frames keep coming (the panel is on screen)", async () => {
    await mount();
    await watchingWithSound();
    for (let t = 1000; t <= 10_000; t += 1000) {
      now = t;
      frames[frames.length - 1]?.(t);
      panel().checkOnScreen();
    }
    expect(openClients()).toHaveLength(1);
    expect(panel().muted).toBe(false);
  });

  it("when the panel is closed", async () => {
    await mount();
    await watchingWithSound();
    const video = panel().video;
    el.remove();
    expect(openClients()).toEqual([]);
    expect(video.muted).toBe(true);
  });
});

describe("connections", () => {
  it("never leaves an old connection running when it restarts mid-connect", async () => {
    Clients.hold = true;
    await mount();
    const first = lastClient();
    const restart = panel().start();
    await flush();
    const second = lastClient();
    expect(second).not.toBe(first);
    expect(first.disconnected).toBe(true);
    // The first connection finishing late changes nothing.
    first.finish();
    first.opts.onState("live");
    second.finish();
    expect(await restart).toBe(true);
    expect(panel().conn).toBe("connecting");
    expect(openClients()).toEqual([second]);
  });

  it("doesn't open a connection for a start that was overtaken while Home Assistant signed its address", async () => {
    await mount();
    // Hold the next signing request, as a slow connection to Home Assistant would.
    let release = () => undefined as void;
    const signing = callWS.getMockImplementation()!;
    callWS.mockImplementationOnce(async (msg: Record<string, unknown>) => {
      await new Promise<void>((r) => (release = r));
      return signing(msg);
    });
    const overtaken = panel().start();
    await flush();
    const winner = panel().start();
    await flush();
    release();
    expect(await overtaken).toBe(false);
    expect(await winner).toBe(true);
    expect(openClients()).toHaveLength(1);
    // The connection that won still drives the panel.
    openClients()[0].opts.onState("live");
    expect(panel().conn).toBe("live");
  });

  it("closes the old stream when switching camera", async () => {
    await mount();
    history.pushState(null, "", "/cameras?camera=kitchen_cam");
    window.dispatchEvent(new Event("location-changed"));
    await flush();
    expect(openClients().map(streamOf)).toEqual(["kitchen_cam"]);
  });
});

describe("HD and SD", () => {
  it.each([
    [{ low_bandwidth: "always" as const }, "doorbell_sub"],
    [{ low_bandwidth: "never" as const }, "doorbell"],
    [{}, "doorbell"], // auto, at home on the LAN
    [{ home_hosts: ["ha.example.com"] }, "doorbell_sub"], // auto, and this address isn't home
  ])("%o uses %s", async (config, stream) => {
    await mount(config);
    expect(streamOf(lastClient())).toBe(stream);
  });

  it("uses SD on mobile data in 'mobile' mode", async () => {
    Object.defineProperty(navigator, "connection", { value: Object.assign(new EventTarget(), { type: "cellular" }), configurable: true });
    try {
      await mount({ low_bandwidth: "mobile" });
      expect(streamOf(lastClient())).toBe("doorbell_sub");
    } finally {
      delete (navigator as { connection?: unknown }).connection;
    }
  });

  it("falls back to the main stream for a camera without an SD one", async () => {
    await mount({ low_bandwidth: "always" }, "/cameras?camera=kitchen_cam");
    expect(streamOf(lastClient())).toBe("kitchen_cam");
  });
});

describe("the doorbell", () => {
  it("switches to the doorbell camera when it rings, and clears the banner 30 s after", async () => {
    await mount({}, "/cameras?camera=driveway");
    el.hass = makeHass({ "binary_sensor.front_door_visitor": "on" });
    await flush();
    expect(panel().ringingIdx).toBe(0);
    expect(panel().selected).toBe(0);
    expect(openClients().map(streamOf)).toEqual(["doorbell"]);

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    el.hass = makeHass({ "binary_sensor.front_door_visitor": "off" });
    await el.updateComplete;
    vi.advanceTimersByTime(29_000);
    expect(panel().ringingIdx).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(panel().ringingIdx).toBe(-1);
  });
});

describe("activity", () => {
  it("lists the camera's events newest first", async () => {
    await mount();
    expect(panel().events.map((e) => e.id)).toEqual(["b", "c", "a"]);
  });

  it("shows only the chosen labels, fetching more so they aren't crowded out", async () => {
    await mount({}, "/cameras?camera=kitchen_cam");
    expect(panel().events.map((e) => e.label)).toEqual(["car", "person"]);
    expect(callWS).toHaveBeenCalledWith(expect.objectContaining({ type: "frigate/events/get", cameras: ["kitchen_cam"], limit: 150 }));
  });

  it("explains when the Frigate integration doesn't answer", async () => {
    eventsFail = true;
    await mount();
    expect(panel().eventsError).toMatch(/Frigate integration/);
  });
});

describe("clip playback window", () => {
  it("pads the event", async () => {
    await mount({ clip_padding: { before: 3, after: 3, min: 6 } });
    expect(panel().clipWindow(event("x", "person", 1000, 1010))).toEqual({ start: 997, end: 1013 });
  });

  it("stretches short events to the minimum length, evenly", async () => {
    await mount({ clip_padding: { before: 0, after: 0, min: 6 } });
    expect(panel().clipWindow(event("x", "person", 1000, 1002))).toEqual({ start: 998, end: 1004 });
  });

  it("never asks for the future while an event is still going", async () => {
    await mount();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(2_000_000_000_000);
    const nowSeconds = 2_000_000_000;
    expect(panel().clipWindow(event("x", "person", nowSeconds - 2, null)).end).toBe(nowSeconds);
  });
});

describe("talking", () => {
  it("needs https, and says so", async () => {
    Object.defineProperty(window, "isSecureContext", { value: false, configurable: true });
    await mount();
    await panel().toggleTalk();
    expect(panel().talkError).toMatch(/secure \(https\)/);
  });

  /** A phone that grants the mic; each request gives a new track. */
  function allowMic() {
    const mics: Array<MediaStreamTrack & { stop: ReturnType<typeof vi.fn> }> = [];
    Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn(async () => {
          const mic = { stop: vi.fn(), kind: "audio" } as unknown as MediaStreamTrack & { stop: ReturnType<typeof vi.fn> };
          mics.push(mic);
          return { getAudioTracks: () => [mic] };
        }),
      },
      configurable: true,
    });
    return mics;
  }

  it("turns the mic on only while talking, and releases it afterwards", async () => {
    const mics = allowMic();
    await mount();
    expect(lastClient().opts.micTrack).toBeUndefined();

    await panel().toggleTalk();
    await flush();
    expect(panel().talking).toBe(true);
    expect(lastClient().opts.micTrack).toBe(mics[0]);
    expect(mics[0].stop).not.toHaveBeenCalled();

    await panel().toggleTalk();
    await flush();
    expect(panel().talking).toBe(false);
    expect(mics[0].stop).toHaveBeenCalled();
    expect(lastClient().opts.micTrack).toBeUndefined();
    expect(openClients()).toHaveLength(1);
  });

  it("keeps the picture quality by default", async () => {
    allowMic();
    await mount();
    await panel().toggleTalk();
    await flush();
    expect(streamOf(lastClient())).toBe("doorbell");
  });

  it("with talk_quality: sd, talks on the SD stream and goes back to HD afterwards", async () => {
    allowMic();
    await mount({ talk_quality: "sd" });
    expect(streamOf(lastClient())).toBe("doorbell");
    await panel().toggleTalk();
    await flush();
    expect(panel().talking).toBe(true);
    expect(openClients().map(streamOf)).toEqual(["doorbell_sub"]);
    expect(lastClient().opts.micTrack).toBeDefined();
    // The quality button (shown once live) says SD during the call.
    lastClient().opts.onState("live");
    await flush();
    expect(el.shadowRoot?.querySelector("button.tool.text")?.textContent?.trim()).toBe("SD");

    await panel().toggleTalk();
    await flush();
    expect(openClients().map(streamOf)).toEqual(["doorbell"]);
    expect(lastClient().opts.micTrack).toBeUndefined();
  });

  it("stays in SD after talking if it was in SD before", async () => {
    allowMic();
    await mount({ talk_quality: "sd", low_bandwidth: "always" });
    await panel().toggleTalk();
    await flush();
    await panel().toggleTalk();
    await flush();
    expect(openClients().map(streamOf)).toEqual(["doorbell_sub"]);
  });

  it("talks in HD if the SD stream won't connect, with the mic opened again", async () => {
    const mics = allowMic();
    Clients.failing.add("doorbell_sub");
    await mount({ talk_quality: "sd" });
    await panel().toggleTalk();
    await flush();
    expect(panel().talking).toBe(true);
    expect(panel().talkError).toBe("");
    expect(openClients().map(streamOf)).toEqual(["doorbell"]);
    expect(mics).toHaveLength(2);
    expect(mics[0].stop).toHaveBeenCalled();
    expect(lastClient().opts.micTrack).toBe(mics[1]);
  });

  it("talks in the usual quality on a camera without an SD stream", async () => {
    allowMic();
    await mount({ talk_quality: "sd" }, "/cameras?camera=kitchen_cam");
    await panel().toggleTalk();
    await flush();
    expect(panel().talking).toBe(true);
    expect(streamOf(lastClient())).toBe("kitchen_cam");
  });

  it("comes back in the usual quality after leaving the screen mid-conversation", async () => {
    allowMic();
    await mount({ talk_quality: "sd" });
    await panel().toggleTalk();
    await flush();
    hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    await flush();
    expect(panel().talking).toBe(false);
    expect(openClients().map(streamOf)).toEqual(["doorbell"]);
    expect(lastClient().opts.micTrack).toBeUndefined();
  });
});
