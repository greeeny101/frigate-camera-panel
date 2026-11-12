"""Serves the panel's file and registers the panel, so it needs no panel_custom YAML.

The cameras come from the Frigate integration's copy of Frigate's config (see frigate.py), and their camera entities
(for pan/tilt/zoom) from the entity registry. The file's address carries the integration's version, so browsers
fetch it again after an update. The config names entities by id, so __init__.py registers the panel again when one
of them is renamed.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.loader import async_get_integration

from .const import (
    CONF_FRIGATE_ENTRY,
    CONF_NAME,
    CONF_SIDEBAR,
    CONF_URL_PATH,
    DEFAULT_NAME,
    DEFAULT_URL_PATH,
    DOMAIN,
    FRIGATE_DOMAIN,
    FRONTEND_URL,
    LOGGER,
    PANEL_ELEMENT,
    PANEL_FILE,
    PANEL_ICON,
)
from .frigate import FrigateCamera, cameras, instance_id
from .panel_config import panel_config

FRONTEND_DIR = Path(__file__).parent / "frontend"


async def async_serve_frontend(hass: HomeAssistant) -> None:
    """Serve the built panel at /frigate_camera_panel/frigate-camera-panel.js (once, for every entry)."""
    await hass.http.async_register_static_paths([StaticPathConfig(FRONTEND_URL, str(FRONTEND_DIR), False)])


def frigate_config(hass: HomeAssistant, frigate_entry_id: str) -> dict[str, Any] | None:
    """Frigate's config, as the Frigate integration fetched it when it was set up; None until it has been."""
    config = hass.data.get(FRIGATE_DOMAIN, {}).get(frigate_entry_id, {}).get("config")
    return config if isinstance(config, dict) else None


def frigate_cameras(hass: HomeAssistant, entry: ConfigEntry) -> list[FrigateCamera]:
    config = frigate_config(hass, entry.data[CONF_FRIGATE_ENTRY])
    return cameras(config) if config else []


def camera_entities(hass: HomeAssistant, frigate_entry_id: str, names: list[str]) -> dict[str, str]:
    """Each Frigate camera's camera entity, as it's called now (it can be renamed)."""
    entities = er.async_get(hass)
    found = {
        name: entities.async_get_entity_id("camera", FRIGATE_DOMAIN, f"{frigate_entry_id}:camera:{name}")
        for name in names
    }
    return {name: entity for name, entity in found.items() if entity}


def url_path(entry: ConfigEntry) -> str:
    return entry.options.get(CONF_URL_PATH) or DEFAULT_URL_PATH


async def async_register(hass: HomeAssistant, entry: ConfigEntry, config: dict[str, Any]) -> dict[str, Any] | None:
    """Register the panel for this Frigate instance, returning its config. None if its address is already in use
    (e.g. by panel_custom YAML)."""
    path = url_path(entry)
    if path in hass.data.get(frontend.DATA_PANELS, {}):
        LOGGER.warning(
            "Not adding the camera panel at /%s: another panel is already there (panel_custom in configuration.yaml?). "
            "Remove that one, or choose another address under Configure → Panel",
            path,
        )
        return None
    frigate_entry_id = entry.data[CONF_FRIGATE_ENTRY]
    found = cameras(config)
    panel = panel_config(
        dict(entry.options),
        instance_id(config),
        found,
        camera_entities(hass, frigate_entry_id, [c.name for c in found]),
    )
    for camera in found:
        if not camera.stream:
            LOGGER.info("Frigate's go2rtc has no stream for camera %s, so the panel leaves it out", camera.name)
    version = (await async_get_integration(hass, DOMAIN)).version
    o = entry.options
    sidebar = o.get(CONF_SIDEBAR, True)
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=path,
        webcomponent_name=PANEL_ELEMENT,
        sidebar_title=(o.get(CONF_NAME) or DEFAULT_NAME) if sidebar else None,
        sidebar_icon=PANEL_ICON if sidebar else None,
        module_url=f"{FRONTEND_URL}/{PANEL_FILE}?v={version}",
        config=panel,
        require_admin=False,
    )
    return panel


def remove(hass: HomeAssistant, entry: ConfigEntry) -> None:
    frontend.async_remove_panel(hass, url_path(entry), warn_if_unknown=False)
