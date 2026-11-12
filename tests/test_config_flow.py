"""Adding the integration (one entry per Frigate instance) and its Configure pages."""

from pytest_homeassistant.common import MockConfigEntry

from custom_components.frigate_camera_panel.const import DOMAIN
from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from .conftest import add_frigate, setup_panel


async def test_needs_frigate(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "no_frigate"


async def test_one_frigate_is_picked_straight_away(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Frigate"
    assert result["data"] == {"frigate_entry_id": frigate.entry_id}
    assert result["options"] == {"panel": True, "url_path": "cameras"}
    await hass.async_block_till_done()

    # Only one panel per Frigate instance.
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"


async def test_choosing_between_two_frigates(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    add_frigate(hass, entry_id="frigate02", title="Frigate 2")
    await setup_panel(hass)
    # One has a panel at /cameras, so only the other is offered... and it's picked straight away, at /cameras-2.
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["options"] == {"panel": True, "url_path": "cameras-2"}


async def test_choosing_between_two_new_frigates(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    add_frigate(hass, entry_id="frigate02", title="Frigate 2")
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {"frigate_entry_id": "frigate02"})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Frigate 2"
    assert result["data"] == {"frigate_entry_id": "frigate02"}


async def _open(hass: HomeAssistant, entry: MockConfigEntry, page: str) -> dict:
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] is FlowResultType.MENU
    assert result["menu_options"] == ["panel", "cameras", "camera"]
    return await hass.config_entries.options.async_configure(result["flow_id"], {"next_step_id": page})


PANEL_FORM = {
    "panel": True,
    "url_path": "/Cams/",
    "sidebar": False,
    "name": "Cams",
    "theme": "ha",
    "low_bandwidth": "never",
    "home_hosts": "192.168.1.10, homeassistant.local",
    "talk_quality": "sd",
    "show_stats": True,
    "clip_before": 5,
    "clip_after": 2,
    "clip_min": 8,
}


async def test_panel_page_keeps_camera_settings(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    entry = await setup_panel(hass, {"panel": True, "url_path": "cameras", "hidden": ["driveway"]})
    result = await _open(hass, entry, "panel")
    assert result["step_id"] == "panel"
    result = await hass.config_entries.options.async_configure(result["flow_id"], PANEL_FORM)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert entry.options == {
        **PANEL_FORM,
        "url_path": "cams",
        "home_hosts": ["192.168.1.10", "homeassistant.local"],
        "hidden": ["driveway"],
    }


async def test_panel_page_refuses_a_reserved_address(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    entry = await setup_panel(hass)
    result = await _open(hass, entry, "panel")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {**PANEL_FORM, "url_path": "lovelace"}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"url_path": "url_path_reserved"}


async def test_cameras_page_hides_cameras(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    entry = await setup_panel(hass, {"panel": True, "url_path": "cameras", "theme": "ha"})
    result = await _open(hass, entry, "cameras")
    assert result["step_id"] == "cameras"
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"cameras": ["driveway"]})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert entry.options == {"panel": True, "url_path": "cameras", "theme": "ha", "hidden": ["front_door"]}


async def test_camera_settings_keep_only_what_differs_from_frigate(
    hass: HomeAssistant, frigate: MockConfigEntry
) -> None:
    entry = await setup_panel(hass)
    result = await _open(hass, entry, "camera")
    assert result["step_id"] == "camera"
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"camera": "front_door"})
    assert result["step_id"] == "camera_settings"
    form = {
        "name": "Doorbell",
        "stream": "front_door",
        "stream_low": "front_door_sub",
        "talk": True,
        "ptz": False,
        "presets": "",
        "labels": ["person"],
        "aspect_ratio": "4/3",
        "doorbell_entity": "binary_sensor.front_door_visitor",
    }
    result = await hass.config_entries.options.async_configure(result["flow_id"], form)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert entry.options["cameras"] == {
        "front_door": {
            "name": "Doorbell",
            "talk": True,
            "labels": ["person"],
            "doorbell_entity": "binary_sensor.front_door_visitor",
        }
    }
    assert entry.options["url_path"] == "cameras"


async def test_camera_settings_back_to_frigates(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    entry = await setup_panel(hass, {"panel": True, "url_path": "cameras", "cameras": {"driveway": {"talk": True}}})
    result = await _open(hass, entry, "camera")
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"camera": "driveway"})
    # Blank optional fields: no lighter stream (Frigate has none for it either), and the picture shape from Frigate.
    form = {"name": "Driveway", "stream": "driveway", "talk": False, "ptz": True}
    result = await hass.config_entries.options.async_configure(result["flow_id"], form)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert entry.options["cameras"] == {}


async def test_camera_settings_refuse_a_bad_picture_shape(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    entry = await setup_panel(hass)
    result = await _open(hass, entry, "camera")
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"camera": "driveway"})
    form = {"name": "Driveway", "stream": "driveway", "talk": False, "ptz": True, "aspect_ratio": "wide"}
    result = await hass.config_entries.options.async_configure(result["flow_id"], form)
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"aspect_ratio": "aspect_ratio_invalid"}


async def test_camera_pages_need_frigate(hass: HomeAssistant, frigate: MockConfigEntry) -> None:
    entry = await setup_panel(hass)
    hass.data["frigate"].pop(frigate.entry_id)
    for page in ("cameras", "camera"):
        result = await _open(hass, entry, page)
        assert result["type"] is FlowResultType.ABORT
        assert result["reason"] == "frigate_not_ready"
