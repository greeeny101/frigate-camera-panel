"""Frigate's cameras, as its config describes them (Frigate's /api/config, which the Frigate integration keeps).

Plain Python (no Home Assistant imports), so python-tests can load it on its own.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import gcd
from typing import Any


@dataclass(frozen=True)
class FrigateCamera:
    """What the panel needs to know about one of Frigate's cameras."""

    # Frigate's name for the camera, as in its config and the activity feed.
    name: str
    # A name to show, until one is chosen: "front_door" is "Front door".
    title: str
    # The go2rtc stream to watch and talk through, and a lighter one (a substream) to save data. None if Frigate's
    # go2rtc has no stream for the camera, in which case the panel can't show it live.
    stream: str | None
    stream_low: str | None
    # The picture's shape, from the camera's detect resolution: "16/9".
    aspect_ratio: str | None
    # Pan/tilt/zoom: Frigate has ONVIF set up for the camera.
    ptz: bool
    # The objects Frigate tracks on the camera, for the activity feed's filter.
    labels: tuple[str, ...]


def instance_id(config: dict[str, Any]) -> str | None:
    """The Frigate instance's id in the integration's addresses (/api/frigate/<id>/...): its MQTT client id."""
    return config.get("mqtt", {}).get("client_id")


def go2rtc_streams(config: dict[str, Any]) -> list[str]:
    """Every stream Frigate's go2rtc has, in its config's order."""
    return list(config.get("go2rtc", {}).get("streams") or {})


def cameras(config: dict[str, Any]) -> list[FrigateCamera]:
    """Frigate's cameras, in its config's order."""
    streams = set(go2rtc_streams(config))
    return [_camera(name, cam or {}, streams) for name, cam in (config.get("cameras") or {}).items()]


def _camera(name: str, cam: dict[str, Any], streams: set[str]) -> FrigateCamera:
    stream, low = _streams(name, cam, streams)
    detect = cam.get("detect") or {}
    return FrigateCamera(
        name=name,
        title=title(name),
        stream=stream,
        stream_low=low,
        aspect_ratio=aspect_ratio(detect.get("width"), detect.get("height")),
        ptz=bool((cam.get("onvif") or {}).get("host")),
        labels=tuple((cam.get("objects") or {}).get("track") or ()),
    )


def _streams(name: str, cam: dict[str, Any], streams: set[str]) -> tuple[str | None, str | None]:
    """The camera's stream and lighter stream.

    The stream is the one the Frigate integration uses: in the camera's live.streams (which maps a label to a go2rtc
    stream), the one named after the camera, or else the first; failing that, a go2rtc stream named after the
    camera. The lighter stream is the next one in live.streams, or a go2rtc stream called <camera>_sub.
    """
    live = [s for s in ((cam.get("live") or {}).get("streams") or {}).values() if s in streams]
    if live:
        stream = name if name in live else live[0]
    else:
        stream = name if name in streams else None
    others = [s for s in live if s != stream]
    if others:
        low: str | None = others[0]
    else:
        low = f"{name}_sub" if f"{name}_sub" in streams and stream else None
    return stream, low


def title(name: str) -> str:
    """A camera's name for people: "front_door" is "Front door"."""
    words = name.replace("_", " ").replace("-", " ").split()
    return " ".join(words)[:1].upper() + " ".join(words)[1:] if words else name


def aspect_ratio(width: Any, height: Any) -> str | None:
    """A picture's shape as the panel takes it: 1280×720 is "16/9", 2560×1920 is "4/3"."""
    if not isinstance(width, int) or not isinstance(height, int) or width <= 0 or height <= 0:
        return None
    d = gcd(width, height)
    return f"{width // d}/{height // d}"
