"""Fixtures for the tests that run the integration inside Home Assistant (pytest-homeassistant).

These catch a Home Assistant release breaking the integration: CI runs them against the newest release and the
newest beta. Frigate is never real: a Frigate config entry is made up, with its config where the Frigate
integration keeps it (hass.data["frigate"][entry id]["config"]) and its camera entities in the registry.
"""

from collections.abc import AsyncGenerator
import copy
from typing import Any

import pytest
from pytest_homeassistant.common import MockConfigEntry

from custom_components.frigate_camera_panel.const import DOMAIN
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

FRIGATE_ENTRY_ID = "frigate01"

# Shaped like Frigate's /api/config (only the parts the integration reads).
FRIGATE_CONFIG: dict[str, Any] = {
    "mqtt": {"topic_prefix": "frigate", "client_id": "frigate"},
    "go2rtc": {
        "streams": {
            "front_door": ["rtsp://camera/main"],
            "front_door_sub": ["rtsp://camera/sub"],
            "driveway": ["rtsp://camera2/main"],
        }
    },
    "cameras": {
        "front_door": {
            "detect": {"width": 1280, "height": 960},
            "live": {"streams": {"Main": "front_door", "Sub": "front_door_sub"}},
            "objects": {"track": ["person", "car"]},
            "onvif": {"host": ""},
        },
        "driveway": {
            "detect": {"width": 1280, "height": 720},
            "live": {"streams": {}},
            "objects": {"track": ["person", "car"]},
            "onvif": {"host": "192.168.1.30"},
        },
    },
}


def add_frigate(
    hass: HomeAssistant,
    config: dict[str, Any] | None = None,
    entry_id: str = FRIGATE_ENTRY_ID,
    title: str = "Frigate",
    loaded: bool = True,
) -> MockConfigEntry:
    """A Frigate integration entry, set up (unless `loaded` is false) with `config`, and its camera entities."""
    config = copy.deepcopy(FRIGATE_CONFIG if config is None else config)
    entry = MockConfigEntry(domain="frigate", entry_id=entry_id, title=title)
    entry.add_to_hass(hass)
    if loaded:
        entry.mock_state(hass, ConfigEntryState.LOADED)
        hass.data.setdefault("frigate", {})[entry_id] = {"config": config}
    entities = er.async_get(hass)
    for name in config["cameras"]:
        entities.async_get_or_create(
            "camera", "frigate", f"{entry_id}:camera:{name}", config_entry=entry, suggested_object_id=name
        )
    return entry


@pytest.fixture
def frigate(hass: HomeAssistant) -> MockConfigEntry:
    return add_frigate(hass)


@pytest.fixture(autouse=True)
async def unload_entries(hass: HomeAssistant) -> AsyncGenerator[None]:
    """Unload the panel's entries after each test, so nothing is left registered or listening."""
    yield
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.state is ConfigEntryState.LOADED:
            await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()


async def setup_panel(
    hass: HomeAssistant, options: dict[str, Any] | None = None, frigate_entry_id: str = FRIGATE_ENTRY_ID
) -> MockConfigEntry:
    """Set up a camera panel entry, by default with the panel at /cameras as a new entry gets it."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Frigate",
        unique_id=frigate_entry_id,
        data={"frigate_entry_id": frigate_entry_id},
        options={"panel": True, "url_path": "cameras"} if options is None else options,
    )
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done(wait_background_tasks=True)
    return entry
