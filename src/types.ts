export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
}

/** The parts of Home Assistant's `hass` object this panel uses. */
export interface HomeAssistant {
  states: Record<string, HassEntity>;
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: { entity_id?: string | string[] },
  ): Promise<unknown>;
  hassUrl?(path?: string): string;
}

export interface PanelInfo<C> {
  config: C;
  url_path: string;
  title: string | null;
}

export interface PtzConfig {
  /** Frigate camera entity to send PTZ commands to. Default camera.<camera>. */
  entity?: string;
  /** Preset names as Frigate lists them for this camera, shown as one-tap buttons. */
  presets?: string[];
}

export interface CameraConfig {
  /** Label shown on the camera switcher. */
  name: string;
  /** go2rtc stream to watch (and talk through). */
  stream: string;
  /** Lighter go2rtc stream (e.g. the camera's substream) used to save mobile data. */
  stream_low?: string;
  /** Frigate camera name, for the activity feed. */
  camera: string;
  aspect_ratio?: string;
  /** Doorbell press sensor; when it fires the panel switches to this camera. */
  doorbell_entity?: string;
  /** Set false for cameras without a speaker or RTSP backchannel. Defaults to true. */
  talk?: boolean;
  /** Only show these Frigate labels in the timeline, e.g. ["person", "car"]. Shows everything if unset. */
  labels?: string[];
  /** Pan/tilt/zoom through Frigate (camera needs ONVIF set up in Frigate). `true` uses the defaults. */
  ptz?: boolean | PtzConfig;
}

export interface ClipPadding {
  /** Seconds of recording to include before the event. Default 3. */
  before?: number;
  /** Seconds of recording to include after the event. Default 3. */
  after?: number;
  /** Minimum clip length in seconds. Default 6. */
  min?: number;
}

export interface CameraPanelConfig {
  frigate_instance?: string;
  ws_path?: string;
  clip_padding?: ClipPadding;
  /**
   * "porch" (default): the panel's own dusk-and-amber look.
   * "ha": follow the user's Home Assistant theme, light or dark.
   */
  theme?: "porch" | "ha";
  /**
   * When to use each camera's `stream_low`:
   * "auto" (default): on mobile data, with Data Saver on, or when opened away from home.
   * "mobile": only on mobile data or with Data Saver on (ignores the address; Android only).
   * "always" / "never": regardless of connection.
   */
  low_bandwidth?: "auto" | "mobile" | "always" | "never";
  /**
   * Addresses that mean "at home", e.g. ["192.168.1.10", "homeassistant.local"].
   * If unset, private network addresses (192.168.x.x, *.local etc.) count as home.
   */
  home_hosts?: string[];
  /**
   * Picture quality while talking. "sd": switch to the camera's `stream_low` for the conversation (less
   * data, so the sound has more room), back again afterwards; that stream needs the RTSP talk source too.
   * "same" (default): keep the current quality.
   */
  talk_quality?: "sd" | "same";
  /** Show the resolution / bitrate / fps pill on the video. Default false. */
  show_stats?: boolean;
  cameras?: CameraConfig[];
  // Single-camera shorthand, used when `cameras` isn't set.
  title?: string;
  stream?: string;
  camera?: string;
  aspect_ratio?: string;
  doorbell_entity?: string;
}

export interface FrigateEvent {
  id: string;
  camera: string;
  label: string;
  sub_label?: string | [string, number] | null;
  start_time: number;
  end_time: number | null;
  has_clip: boolean;
  has_snapshot: boolean;
}
