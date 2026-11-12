from frigate_config import CONFIG
import pytest

from frigate_camera_panel.frigate import cameras
from frigate_camera_panel.panel_config import (
    config_entities,
    panel_config,
    renamed_options,
    split_list,
    url_path_error,
)

CAMERAS = cameras(CONFIG)
ENTITIES = {"front_door": "camera.front_door", "driveway": "camera.driveway", "garden": "camera.garden"}


def test_defaults_from_frigate():
    config = panel_config({}, "frigate", CAMERAS, ENTITIES)
    assert config == {
        "frigate_instance": "frigate",
        "theme": "porch",
        "low_bandwidth": "auto",
        "talk_quality": "same",
        "show_stats": False,
        "clip_padding": {"before": 3, "after": 3, "min": 6},
        "cameras": [
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
                "stream_low": "driveway_sub",
                "aspect_ratio": "16/9",
                # ONVIF is set up in Frigate.
                "ptz": {"entity": "camera.driveway"},
            },
            {
                "name": "Garden",
                "stream": "garden_live",
                "camera": "garden",
                "talk": False,
                "stream_low": "garden_low",
                "aspect_ratio": "16/9",
            },
            # The shed has no go2rtc stream, so it's left out.
        ],
    }


def test_changed_camera_settings():
    options = {
        "cameras": {
            "front_door": {
                "name": "Doorbell",
                "talk": True,
                "labels": ["person"],
                "doorbell_entity": "binary_sensor.front_door_visitor",
                "stream_low": None,
            },
            "driveway": {"ptz": True, "presets": ["gate", "street"]},
            "garden": {"ptz": False, "aspect_ratio": "4/3"},
        }
    }
    front, driveway, garden = panel_config(options, "frigate", CAMERAS, ENTITIES)["cameras"]
    assert front == {
        "name": "Doorbell",
        "stream": "front_door",
        "camera": "front_door",
        "talk": True,
        "aspect_ratio": "4/3",
        "labels": ["person"],
        "doorbell_entity": "binary_sensor.front_door_visitor",
    }
    assert driveway["ptz"] == {"entity": "camera.driveway", "presets": ["gate", "street"]}
    assert "ptz" not in garden
    assert garden["aspect_ratio"] == "4/3"


def test_ptz_needs_the_camera_entity():
    options = {"cameras": {"garden": {"ptz": True}}}
    garden = panel_config(options, "frigate", CAMERAS, {})["cameras"][2]
    assert "ptz" not in garden


def test_hidden_cameras_are_left_out():
    config = panel_config({"hidden": ["driveway", "garden"]}, "frigate", CAMERAS, ENTITIES)
    assert [c["camera"] for c in config["cameras"]] == ["front_door"]


def test_settings_for_a_camera_frigate_no_longer_has_are_ignored():
    config = panel_config({"cameras": {"old_cam": {"talk": True}}}, "frigate", CAMERAS, ENTITIES)
    assert "old_cam" not in [c["camera"] for c in config["cameras"]]


def test_panel_options():
    options = {
        "theme": "ha",
        "low_bandwidth": "never",
        "talk_quality": "sd",
        "show_stats": True,
        "home_hosts": ["192.168.1.10", "homeassistant.local"],
        "clip_before": 5,
        "clip_after": 2,
        "clip_min": 10,
    }
    config = panel_config(options, None, CAMERAS, ENTITIES)
    assert "frigate_instance" not in config
    assert config["theme"] == "ha"
    assert config["low_bandwidth"] == "never"
    assert config["talk_quality"] == "sd"
    assert config["show_stats"] is True
    assert config["home_hosts"] == ["192.168.1.10", "homeassistant.local"]
    assert config["clip_padding"] == {"before": 5, "after": 2, "min": 10}


def test_config_entities():
    options = {"cameras": {"front_door": {"doorbell_entity": "binary_sensor.visitor"}}}
    config = panel_config(options, "frigate", CAMERAS, ENTITIES)
    assert config_entities(config) == {"binary_sensor.visitor", "camera.driveway"}


def test_renamed_options():
    options = {"cameras": {"front_door": {"doorbell_entity": "binary_sensor.visitor", "talk": True}}}
    renamed = renamed_options(options, "binary_sensor.visitor", "binary_sensor.doorbell")
    assert renamed == {"cameras": {"front_door": {"doorbell_entity": "binary_sensor.doorbell", "talk": True}}}
    assert renamed_options(options, "binary_sensor.other", "binary_sensor.x") is None
    assert renamed_options({}, "a.b", "a.c") is None


@pytest.mark.parametrize(
    ("path", "error"),
    [
        ("cameras", None),
        ("cameras-2", None),
        ("Cameras", "url_path_invalid"),
        ("-cams", "url_path_invalid"),
        ("my cams", "url_path_invalid"),
        ("frigate", "url_path_reserved"),
        ("lovelace", "url_path_reserved"),
        ("taken", "url_path_taken"),
    ],
)
def test_url_path_error(path, error):
    assert url_path_error(path, {"taken"}) == error


def test_split_list():
    assert split_list("a, b,\nc ,, ") == ["a", "b", "c"]
    assert split_list("") == []
    assert split_list(None) == []
