import { describe, expect, it, vi } from "vitest";
import { clipUrl, fetchEvents, recordingPath, signPath, signedWsUrl, thumbUrl } from "../src/frigate";
import type { HomeAssistant } from "../src/types";

const hassWith = (callWS: (msg: Record<string, unknown>) => unknown, extra: Partial<HomeAssistant> = {}): HomeAssistant => ({
  states: {},
  callWS: vi.fn(async (msg: Record<string, unknown>) => callWS(msg)) as HomeAssistant["callWS"],
  callService: vi.fn(),
  ...extra,
});

const signing = (msg: Record<string, unknown>) => ({ path: `${msg.path}${String(msg.path).includes("?") ? "&" : "?"}authSig=abc` });

describe("signing paths", () => {
  it("asks Home Assistant to sign the path for five minutes", async () => {
    const hass = hassWith(signing);
    expect(await signPath(hass, "/api/x")).toBe("/api/x?authSig=abc");
    expect(hass.callWS).toHaveBeenCalledWith({ type: "auth/sign_path", path: "/api/x", expires: 300 });
  });

  it("turns a signed path into a WebSocket address on the page's own host", async () => {
    const url = await signedWsUrl(hassWith(signing), "/api/frigate/frigate/mse/api/ws?src=doorbell");
    expect(url).toBe("ws://192.168.1.20:8123/api/frigate/frigate/mse/api/ws?src=doorbell&authSig=abc");
  });

  it("uses wss:// when Home Assistant is on https (the Companion app away from home)", async () => {
    const hass = hassWith(signing, { hassUrl: (p = "") => `https://ha.example.com${p}` });
    expect(await signedWsUrl(hass, "/api/ws?src=x")).toBe("wss://ha.example.com/api/ws?src=x&authSig=abc");
  });
});

describe("fetchEvents", () => {
  it("asks the Frigate integration for one camera's events", async () => {
    const hass = hassWith(() => []);
    await fetchEvents(hass, "frigate", "doorbell", 150);
    expect(hass.callWS).toHaveBeenCalledWith({ type: "frigate/events/get", instance_id: "frigate", cameras: ["doorbell"], limit: 150 });
  });

  it("accepts the events as a JSON string or already parsed (it varies by integration version)", async () => {
    const events = [{ id: "a", label: "person" }];
    expect(await fetchEvents(hassWith(() => JSON.stringify(events)), "frigate", "doorbell")).toEqual(events);
    expect(await fetchEvents(hassWith(() => events), "frigate", "doorbell")).toEqual(events);
  });

  it("gives an empty list for anything else", async () => {
    expect(await fetchEvents(hassWith(() => ({ error: "no" })), "frigate", "doorbell")).toEqual([]);
  });
});

describe("addresses through the Frigate integration's proxy", () => {
  it("builds thumbnail, clip and recording paths", () => {
    expect(thumbUrl("frigate", "123.4-abc")).toBe("/api/frigate/frigate/notifications/123.4-abc/thumbnail.jpg");
    expect(clipUrl("frigate", "doorbell", "123.4-abc")).toBe("/api/frigate/frigate/notifications/123.4-abc/doorbell/clip.mp4");
    expect(recordingPath("frigate", "doorbell", 100, 160)).toBe("/api/frigate/frigate/recording/doorbell/start/100/end/160");
  });
});
