/** Small helpers for the panel, kept apart from the element so they can be tested on their own. */
import type { FrigateEvent } from "./types";

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });

export function dayLabel(ts: number): string {
  const d = new Date(ts * 1000);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return dayFmt.format(d);
}

export function labelText(ev: FrigateEvent): string {
  const sub = Array.isArray(ev.sub_label) ? ev.sub_label[0] : ev.sub_label;
  if (sub) return sub;
  return ev.label.charAt(0).toUpperCase() + ev.label.slice(1);
}

/** 720p / 1080p / 1440p / 4K for widescreen and small streams; megapixels (e.g. 5MP) for other large shapes. */
export function resolutionLabel(w: number, h: number): string {
  if (!w || !h) return "";
  if (w >= 3840 || h >= 2160) return "4K";
  const megapixels = (w * h) / 1_000_000;
  // Substreams like 640×480 would round to "0MP", so small or widescreen streams use line count.
  if (megapixels < 1.5 || Math.abs(w / h - 16 / 9) < 0.05) return `${h}p`;
  return `${Math.round(megapixels)}MP`;
}

export function bitrateText(kbps: number): string {
  if (kbps <= 0) return "";
  return kbps >= 1000 ? `${(kbps / 1000).toFixed(1)} Mbps` : `${Math.round(kbps)} kbps`;
}

export interface NetworkInformationLike extends EventTarget {
  type?: string;
  effectiveType?: string;
  saveData?: boolean;
}
export const connectionInfo = (): NetworkInformationLike | undefined =>
  (navigator as Navigator & { connection?: NetworkInformationLike }).connection;

/** Mobile data, Data Saver, or a very slow link. Only Chromium (Android) reports this; elsewhere it's false. */
export function onConstrainedNetwork(): boolean {
  const c = connectionInfo();
  if (!c) return false;
  return Boolean(c.saveData) || c.type === "cellular" || ["slow-2g", "2g", "3g"].includes(c.effectiveType ?? "");
}

/** Home Assistant opened on a local address (LAN IP, .local, single-word host name). */
export function isHomeHost(host: string, homeHosts?: string[]): boolean {
  if (homeHosts?.length) return homeHosts.includes(host);
  if (host === "localhost" || !host.includes(".")) return true;
  if (/\.(local|lan|home\.arpa|internal)$/i.test(host)) return true;
  const m = host.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
}

/** "4/3", "16/9" or "1.33" → width ÷ height. Falls back to 16:9. */
export function parseRatio(value?: string): number {
  if (!value) return 16 / 9;
  const [w, h] = value.split("/").map((n) => Number(n.trim()));
  const ratio = h ? w / h : w;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 16 / 9;
}
