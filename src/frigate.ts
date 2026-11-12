import type { FrigateEvent, HomeAssistant } from "./types";

/**
 * Signs a Home Assistant path so a WebSocket can authenticate with it
 * (WebSockets can't send the usual auth header), then turns it into a ws(s):// URL.
 */
export async function signedWsUrl(hass: HomeAssistant, path: string): Promise<string> {
  const signed = await signPath(hass, path);
  const absolute = hass.hassUrl ? hass.hassUrl(signed) : new URL(signed, location.origin).toString();
  const url = new URL(absolute);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

/** Signs a Home Assistant path so a <video> or WebSocket can load it without an auth header. */
export async function signPath(hass: HomeAssistant, path: string, expires = 300): Promise<string> {
  const { path: signed } = await hass.callWS<{ path: string }>({ type: "auth/sign_path", path, expires });
  return signed;
}

/** Recent Frigate events for one camera, via the Frigate integration's websocket API. */
export async function fetchEvents(
  hass: HomeAssistant,
  instance: string,
  camera: string,
  limit = 40,
): Promise<FrigateEvent[]> {
  const res = await hass.callWS<unknown>({
    type: "frigate/events/get",
    instance_id: instance,
    cameras: [camera],
    limit,
  });
  // Depending on the integration version this arrives as a JSON string or already parsed.
  const parsed = typeof res === "string" ? JSON.parse(res) : res;
  return Array.isArray(parsed) ? (parsed as FrigateEvent[]) : [];
}

// The Frigate integration proxies these through Home Assistant, so Frigate's
// own port never needs to be reachable from the phone.
export const thumbUrl = (instance: string, id: string) =>
  `/api/frigate/${instance}/notifications/${id}/thumbnail.jpg`;

export const clipUrl = (instance: string, camera: string, id: string) =>
  `/api/frigate/${instance}/notifications/${id}/${camera}/clip.mp4`;

/**
 * Any time range from Frigate's recordings as an MP4, via the Frigate integration's
 * recording proxy. Unlike the event clip, this isn't trimmed to the object's lifetime.
 * Requires Home Assistant auth, so sign it with signPath() before use.
 */
export const recordingPath = (instance: string, camera: string, start: number, end: number) =>
  `/api/frigate/${instance}/recording/${camera}/start/${start}/end/${end}`;
