import { afterEach, describe, expect, it, vi } from "vitest";
import { bitrateText, dayLabel, isHomeHost, labelText, onConstrainedNetwork, parseRatio, resolutionLabel } from "../src/util";
import type { FrigateEvent } from "../src/types";

const event = (label: string, sub_label?: FrigateEvent["sub_label"]): FrigateEvent => ({
  id: "1",
  camera: "doorbell",
  label,
  sub_label,
  start_time: 0,
  end_time: null,
  has_clip: true,
  has_snapshot: true,
});

describe("labelText", () => {
  it("prefers Frigate's sub label (a name), in either of its shapes", () => {
    expect(labelText(event("cat", "Rex"))).toBe("Rex");
    expect(labelText(event("person", ["Sam", 0.92]))).toBe("Sam");
  });

  it("otherwise capitalises the object", () => {
    expect(labelText(event("person"))).toBe("Person");
    expect(labelText(event("car", null))).toBe("Car");
  });
});

describe("dayLabel", () => {
  afterEach(() => vi.useRealTimers());

  it("says Today and Yesterday, then the date", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 10, 12, 0));
    const at = (d: Date) => d.getTime() / 1000;
    expect(dayLabel(at(new Date(2026, 9, 10, 7, 30)))).toBe("Today");
    expect(dayLabel(at(new Date(2026, 9, 9, 23, 59)))).toBe("Yesterday");
    expect(dayLabel(at(new Date(2026, 9, 7, 9, 0)))).not.toMatch(/Today|Yesterday/);
  });
});

describe("resolutionLabel", () => {
  it.each([
    [3840, 2160, "4K"],
    [2560, 1440, "1440p"],
    [1920, 1080, "1080p"],
    [640, 480, "480p"],
    [2560, 1920, "5MP"],
    [0, 0, ""],
  ])("%d×%d is %s", (w, h, label) => {
    expect(resolutionLabel(w, h)).toBe(label);
  });
});

describe("bitrateText", () => {
  it("uses kbps under 1 Mbps and Mbps above", () => {
    expect(bitrateText(0)).toBe("");
    expect(bitrateText(512.4)).toBe("512 kbps");
    expect(bitrateText(2450)).toBe("2.5 Mbps");
  });
});

describe("isHomeHost", () => {
  it.each([
    ["192.168.1.20", true],
    ["10.0.0.5", true],
    ["172.16.0.1", true],
    ["172.32.0.1", false],
    ["homeassistant.local", true],
    ["homeassistant", true],
    ["localhost", true],
    ["homeassistant101.mywire.org", false],
    ["8.8.8.8", false],
  ])("%s at home: %s", (host, home) => {
    expect(isHomeHost(host)).toBe(home);
  });

  it("uses the configured home addresses instead, when given", () => {
    expect(isHomeHost("192.168.1.20", ["ha.example.com"])).toBe(false);
    expect(isHomeHost("ha.example.com", ["ha.example.com"])).toBe(true);
  });
});

describe("parseRatio", () => {
  it("reads w/h or a decimal, falling back to 16:9", () => {
    expect(parseRatio("4/3")).toBeCloseTo(4 / 3);
    expect(parseRatio("16 / 9")).toBeCloseTo(16 / 9);
    expect(parseRatio("1.5")).toBe(1.5);
    expect(parseRatio()).toBeCloseTo(16 / 9);
    expect(parseRatio("wide")).toBeCloseTo(16 / 9);
    expect(parseRatio("0/0")).toBeCloseTo(16 / 9);
  });
});

describe("onConstrainedNetwork", () => {
  afterEach(() => {
    delete (navigator as { connection?: unknown }).connection;
  });

  const connection = (c: Record<string, unknown>) =>
    Object.defineProperty(navigator, "connection", { value: Object.assign(new EventTarget(), c), configurable: true });

  it("is false where the browser doesn't say (everything but Chromium)", () => {
    expect(onConstrainedNetwork()).toBe(false);
  });

  it("is true on mobile data, with Data Saver, or on a slow link", () => {
    connection({ type: "cellular" });
    expect(onConstrainedNetwork()).toBe(true);
    connection({ type: "wifi", saveData: true });
    expect(onConstrainedNetwork()).toBe(true);
    connection({ type: "wifi", effectiveType: "3g" });
    expect(onConstrainedNetwork()).toBe(true);
    connection({ type: "wifi", effectiveType: "4g" });
    expect(onConstrainedNetwork()).toBe(false);
  });
});
