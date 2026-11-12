"""Setting up a camera panel: the panel and its cameras from Frigate, waiting for Frigate, renames and reloads."""

import copy

import pytest
from pytest_homeassistant.common import MockConfigEntry
from pytest_homeassistant.typing import ClientSessionGenerator

from homeassistant.components import frontend, panel_custom
from homeassistant.config_entries import SIGNAL_CONFIG_ENTRY_CHANGED, ConfigEntryChange, ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .conftest import FRIGATE_CONFIG, FRIGATE_ENTRY_ID, add_frigate, setup_panel


def _panel(hass: HomeAssistant, path: str = "cameras") -> dict | None:
    panel = hass.data.get(frontend.DATA_PANELS, {}).get(path)
    return panel.to_response() if panel else None


def _cameras(hass: HomeAssistant, path: str = "cameras") -> list[dict]:
    return _panel(hass, path)["config"]["cameras"]


async def test_sets_up_the_panel(
    hass: HomeAssistant, frigate: MockConfigEntry, hass_client: ClientSessionGenerator
) -> None:
    entry = await setup_panel(hass)
    assert entry.state is ConfigEntryState.LOADED
    panel = _panel(hass)
    assert panel is not None
    assert panel["component_name"] == "custom"
    assert panel["require_admin"] is False
    assert panel["title"] == "Cameras"
    assert panel["icon"] == "mdi:cctv"
    custom = panel["config"]["_panel_custom"]
    assert custom["name"] == "frigate-camera-panel"
    assert custom["module_url"].startswith("/frigate_camera_panel/frigate-camera-panel.js?v=")

    config = panel["config"]
    assert config["frigate_instance"] == "frigate"
    assert config["cameras"] == [
        {
            "name": "Front door",
            "stream": "front_door",
            "camera": "front_door",
            "talk": False,
            "stream_low": "front_door_sub",
            "aspect_ratio": "4/3",
        },
        {
            "name": "Driveway",
            "stream": "driveway",
            "camera": "driveway",
            "talk": False,
            "aspect_ratio": "16/9",
            # ONVIF is set up for it in Frigate, and the Frigate integration made its camera entity.
            "ptz": {"entity": "camera.driveway"},
        },
    ]

    # The panel's file is served, to anyone (the browser fetches it before logging in to the websocket).
    response = await (await hass_client()).get(custom["module_url"])
    assert response.status == 200
    assert "frigate-camera-panel" in await response.text()


async def test_not_in_the_sidebar(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    await setup_panel(hass, {"panel": True, "url_path": "cams", "sidebar": False})
    panel = _panel(hass, "cams")
    assert panel["title"] is None
    assert panel["icon"] is None


async def test_panel_turned_off(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    entry = await setup_panel(hass, {"panel": False})
    assert entry.state is ConfigEntryState.LOADED
    assert _panel(hass) is None


async def test_waits_for_frigate(hass: HomeAssistant) -> None:
    """Set up before the Frigate integration (at start-up, say): tried again once Frigate has its config."""
    frigate = add_frigate(hass, loaded=False)
    entry = await setup_panel(hass)
    assert entry.state is ConfigEntryState.SETUP_RETRY
    assert _panel(hass) is None

    frigate.mock_state(hass, ConfigEntryState.LOADED)
    hass.data.setdefault("frigate", {})[FRIGATE_ENTRY_ID] = {"config": copy.deepcopy(FRIGATE_CONFIG)}
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED
    assert _panel(hass) is not None


async def test_follows_a_frigate_reload_with_new_cameras(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    await setup_panel(hass)
    config = copy.deepcopy(FRIGATE_CONFIG)
    config["go2rtc"]["streams"]["garden"] = ["rtsp://camera3/main"]
    config["cameras"]["garden"] = {"detect": {"width": 640, "height": 360}, "objects": {"track": ["person"]}}
    hass.data["frigate"][FRIGATE_ENTRY_ID]["config"] = config
    async_dispatcher_send(hass, SIGNAL_CONFIG_ENTRY_CHANGED, ConfigEntryChange.UPDATED, frigate)
    await hass.async_block_till_done()
    assert [c["camera"] for c in _cameras(hass)] == ["front_door", "driveway", "garden"]


async def test_other_entry_changes_change_nothing(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    entry = await setup_panel(hass)
    other = MockConfigEntry(domain="other")
    other.add_to_hass(hass)
    async_dispatcher_send(hass, SIGNAL_CONFIG_ENTRY_CHANGED, ConfigEntryChange.UPDATED, other)
    # Frigate's own entry changing state without a new config (no reload of ours either).
    async_dispatcher_send(hass, SIGNAL_CONFIG_ENTRY_CHANGED, ConfigEntryChange.UPDATED, frigate)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED
    assert len(_cameras(hass)) == 2


async def test_address_already_taken(
    hass: HomeAssistant, frigate: MockConfigEntry, caplog: pytest.LogCaptureFixture
) -> None:
    # A panel_custom panel from configuration.yaml got there first.
    await panel_custom.async_register_panel(
        hass, frontend_url_path="cameras", webcomponent_name="doorbell-panel", module_url="/local/old.js"
    )
    entry = await setup_panel(hass)
    assert entry.state is ConfigEntryState.LOADED
    assert "Not adding the camera panel at /cameras" in caplog.text
    assert _panel(hass)["config"]["_panel_custom"]["module_url"] == "/local/old.js"

    # Unloading the entry leaves the other panel alone.
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert _panel(hass)["config"]["_panel_custom"]["module_url"] == "/local/old.js"


async def test_unload_removes_the_panel(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    entry = await setup_panel(hass)
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert _panel(hass) is None


async def test_two_frigate_instances(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    config = copy.deepcopy(FRIGATE_CONFIG)
    config["mqtt"]["client_id"] = "frigate2"
    add_frigate(hass, config, entry_id="frigate02", title="Frigate 2")
    await setup_panel(hass)
    await setup_panel(hass, {"panel": True, "url_path": "cameras-2"}, frigate_entry_id="frigate02")
    assert _panel(hass)["config"]["frigate_instance"] == "frigate"
    assert _panel(hass, "cameras-2")["config"]["frigate_instance"] == "frigate2"


async def test_renamed_camera_entity(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    await setup_panel(hass)
    er.async_get(hass).async_update_entity("camera.driveway", new_entity_id="camera.drive")
    await hass.async_block_till_done()
    assert _cameras(hass)[1]["ptz"] == {"entity": "camera.drive"}


async def test_renamed_doorbell_sensor(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    entities = er.async_get(hass)
    entities.async_get_or_create("binary_sensor", "reolink", "visitor", suggested_object_id="front_door_visitor")
    entry = await setup_panel(
        hass,
        {
            "panel": True,
            "url_path": "cameras",
            "cameras": {"front_door": {"doorbell_entity": "binary_sensor.front_door_visitor", "talk": True}},
        },
    )
    assert _cameras(hass)[0]["doorbell_entity"] == "binary_sensor.front_door_visitor"
    entities.async_update_entity("binary_sensor.front_door_visitor", new_entity_id="binary_sensor.doorbell")
    await hass.async_block_till_done()
    assert entry.options["cameras"]["front_door"] == {"doorbell_entity": "binary_sensor.doorbell", "talk": True}
    assert _cameras(hass)[0]["doorbell_entity"] == "binary_sensor.doorbell"


async def test_other_renames_change_nothing(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    entities = er.async_get(hass)
    entities.async_get_or_create("sensor", "test", "x", suggested_object_id="unrelated")
    entry = await setup_panel(hass)
    options = dict(entry.options)
    entities.async_update_entity("sensor.unrelated", new_entity_id="sensor.other")
    await hass.async_block_till_done()
    assert dict(entry.options) == options
    assert len(_cameras(hass)) == 2
