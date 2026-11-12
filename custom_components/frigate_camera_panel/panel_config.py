"""The panel's config, worked out from Frigate's cameras and the integration's options.

The panel takes the same config as the panel_custom YAML in the README (see src/types.ts). Each camera starts from
what Frigate's config says (frigate.py) and takes whatever was changed for it under Configure → Camera settings.
panel.py fills in the Frigate camera entities from Home Assistant's registry and registers the panel.

Plain Python (no Home Assistant imports), so python-tests can load it on its own.
"""

from __future__ import annotations

import re
from typing import Any

from .const import (
    CONF_ASPECT_RATIO,
    CONF_CAMERAS,
    CONF_CLIP_AFTER,
    CONF_CLIP_BEFORE,
    CONF_CLIP_MIN,
    CONF_DOORBELL_ENTITY,
    CONF_HIDDEN,
    CONF_HOME_HOSTS,
    CONF_LABELS,
    CONF_LOW_BANDWIDTH,
    CONF_NAME,
    CONF_PRESETS,
    CONF_PTZ,
    CONF_SHOW_STATS,
    CONF_STREAM,
    CONF_STREAM_LOW,
    CONF_TALK,
    CONF_TALK_QUALITY,
    CONF_THEME,
)
from .frigate import FrigateCamera

THEMES = ["porch", "ha"]
LOW_BANDWIDTH = ["auto", "mobile", "always", "never"]
TALK_QUALITY = ["same", "sd"]
CLIP_DEFAULTS = {CONF_CLIP_BEFORE: 3, CONF_CLIP_AFTER: 3, CONF_CLIP_MIN: 6}

# Addresses Home Assistant (or HACS) already uses, or keeps for itself.
RESERVED_PATHS = {
    "api", "auth", "calendar", "climate", "config", "developer-tools", "energy", "frigate", "hacs", "hacsfiles",
    "history", "home", "light", "local", "logbook", "lovelace", "maintenance", "map", "media-browser", "profile",
    "security", "static", "todo",
}  # fmt: skip
URL_PATH = re.compile(r"^[a-z0-9][a-z0-9-]*$")
ASPECT_RATIO = re.compile(r"^\d+(\.\d+)?/\d+(\.\d+)?$")


def url_path_error(path: str, taken: set[str]) -> str | None:
    """Why the panel can't have this address (a translation key), or None if it can."""
    if not URL_PATH.match(path):
        return "url_path_invalid"
    if path in RESERVED_PATHS:
        return "url_path_reserved"
    if path in taken:
        return "url_path_taken"
    return None


def split_list(text: str | None) -> list[str]:
    """A list typed as text, one item per comma or line: "a, b" is ["a", "b"]."""
    return [item.strip() for item in re.split(r"[,\n]", text or "") if item.strip()]


def camera_settings(camera: FrigateCamera, options: dict[str, Any]) -> dict[str, Any]:
    """One camera's settings: what Frigate says, with whatever was changed for it in the options."""
    changed = options.get(CONF_CAMERAS, {}).get(camera.name, {})
    return {
        CONF_NAME: camera.title,
        CONF_STREAM: camera.stream,
        CONF_STREAM_LOW: camera.stream_low,
        # A camera needs an RTSP source with a backchannel in go2rtc to talk through, which Frigate's config doesn't
        # say, so it's off until it's turned on.
        CONF_TALK: False,
        CONF_PTZ: camera.ptz,
        CONF_PRESETS: [],
        CONF_LABELS: [],
        CONF_ASPECT_RATIO: camera.aspect_ratio,
        CONF_DOORBELL_ENTITY: None,
        **changed,
    }


def panel_config(
    options: dict[str, Any],
    instance_id: str | None,
    cameras: list[FrigateCamera],
    camera_entities: dict[str, str],
) -> dict[str, Any]:
    """The panel's config, in the same shape as its panel_custom YAML.

    `camera_entities` maps a Frigate camera name to its camera entity in Home Assistant, for pan/tilt/zoom. A camera
    that's hidden, or has no go2rtc stream to watch, is left out.
    """
    hidden = set(options.get(CONF_HIDDEN, []))
    shown = []
    for camera in cameras:
        s = camera_settings(camera, options)
        if camera.name in hidden or not s[CONF_STREAM]:
            continue
        entry: dict[str, Any] = {
            "name": s[CONF_NAME] or camera.title,
            "stream": s[CONF_STREAM],
            "camera": camera.name,
            "talk": bool(s[CONF_TALK]),
        }
        if s[CONF_STREAM_LOW] and s[CONF_STREAM_LOW] != s[CONF_STREAM]:
            entry["stream_low"] = s[CONF_STREAM_LOW]
        if s[CONF_ASPECT_RATIO]:
            entry["aspect_ratio"] = s[CONF_ASPECT_RATIO]
        if s[CONF_LABELS]:
            entry["labels"] = list(s[CONF_LABELS])
        if s[CONF_DOORBELL_ENTITY]:
            entry["doorbell_entity"] = s[CONF_DOORBELL_ENTITY]
        if s[CONF_PTZ] and camera.name in camera_entities:
            ptz: dict[str, Any] = {"entity": camera_entities[camera.name]}
            if s[CONF_PRESETS]:
                ptz["presets"] = list(s[CONF_PRESETS])
            entry["ptz"] = ptz
        shown.append(entry)

    config: dict[str, Any] = {
        "theme": options.get(CONF_THEME, THEMES[0]),
        "low_bandwidth": options.get(CONF_LOW_BANDWIDTH, LOW_BANDWIDTH[0]),
        "talk_quality": options.get(CONF_TALK_QUALITY, TALK_QUALITY[0]),
        "show_stats": bool(options.get(CONF_SHOW_STATS, False)),
        "clip_padding": {
            "before": options.get(CONF_CLIP_BEFORE, CLIP_DEFAULTS[CONF_CLIP_BEFORE]),
            "after": options.get(CONF_CLIP_AFTER, CLIP_DEFAULTS[CONF_CLIP_AFTER]),
            "min": options.get(CONF_CLIP_MIN, CLIP_DEFAULTS[CONF_CLIP_MIN]),
        },
        "cameras": shown,
    }
    if instance_id:
        config["frigate_instance"] = instance_id
    if hosts := options.get(CONF_HOME_HOSTS):
        config["home_hosts"] = list(hosts)
    return config


def config_entities(config: dict[str, Any]) -> set[str]:
    """Every entity the panel's config names, so a rename of any of them can be followed."""
    ids: set[str] = set()
    for camera in config.get("cameras", []):
        ids.add(camera.get("doorbell_entity"))
        ids.add((camera.get("ptz") or {}).get("entity"))
    return {i for i in ids if i}


def renamed_options(options: dict[str, Any], old: str, new: str) -> dict[str, Any] | None:
    """The options with entity `old` renamed to `new`, or None if they don't name it."""
    cameras = options.get(CONF_CAMERAS, {})
    changed = {
        name: {**s, CONF_DOORBELL_ENTITY: new} if s.get(CONF_DOORBELL_ENTITY) == old else s
        for name, s in cameras.items()
    }
    return {**options, CONF_CAMERAS: changed} if changed != cameras else None
