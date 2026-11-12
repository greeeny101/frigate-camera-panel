from frigate_config import CONFIG
import pytest

from frigate_camera_panel.frigate import FrigateCamera, aspect_ratio, cameras, instance_id, title


def test_finds_every_camera_in_order():
    assert [c.name for c in cameras(CONFIG)] == ["front_door", "driveway", "garden", "shed"]


def test_camera_with_live_streams():
    assert cameras(CONFIG)[0] == FrigateCamera(
        name="front_door",
        title="Front door",
        stream="front_door",
        stream_low="front_door_sub",
        aspect_ratio="4/3",
        ptz=False,
        labels=("person", "car", "package"),
    )


def test_camera_without_live_streams_uses_its_name_and_sub():
    driveway = cameras(CONFIG)[1]
    assert (driveway.stream, driveway.stream_low) == ("driveway", "driveway_sub")
    assert driveway.ptz is True
    assert driveway.aspect_ratio == "16/9"


def test_live_streams_named_differently():
    garden = cameras(CONFIG)[2]
    assert (garden.stream, garden.stream_low) == ("garden_live", "garden_low")


def test_camera_go2rtc_doesnt_have():
    shed = cameras(CONFIG)[3]
    assert (shed.stream, shed.stream_low) == (None, None)


def test_live_stream_go2rtc_doesnt_have_is_ignored():
    config = {
        "go2rtc": {"streams": {"cam": []}},
        "cameras": {"cam": {"live": {"streams": {"Main": "missing", "Sub": "cam"}}}},
    }
    cam = cameras(config)[0]
    assert (cam.stream, cam.stream_low) == ("cam", None)


def test_sparse_config():
    """A camera with almost nothing set, and a config without go2rtc."""
    assert cameras({"cameras": {"cam": None}}) == [FrigateCamera("cam", "Cam", None, None, None, False, ())]
    assert cameras({}) == []


def test_instance_id():
    assert instance_id(CONFIG) == "frigate"
    assert instance_id({}) is None


@pytest.mark.parametrize(
    ("name", "expected"), [("front_door", "Front door"), ("Garage-Cam", "Garage Cam"), ("e1", "E1"), ("", "")]
)
def test_title(name, expected):
    assert title(name) == expected


@pytest.mark.parametrize(
    ("width", "height", "expected"),
    [(1280, 720, "16/9"), (2560, 1920, "4/3"), (896, 512, "7/4"), (0, 720, None), (None, None, None), ("1", 2, None)],
)
def test_aspect_ratio(width, height, expected):
    assert aspect_ratio(width, height) == expected
