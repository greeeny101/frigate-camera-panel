"""A Frigate config, shaped like Frigate's /api/config (only the parts the integration reads, plus a few it doesn't)."""

CONFIG = {
    "mqtt": {"enabled": True, "host": "mqtt.local", "topic_prefix": "frigate", "client_id": "frigate"},
    "go2rtc": {
        "streams": {
            "front_door": ["rtsp://user:pass@camera/main", "ffmpeg:front_door#audio=opus"],
            "front_door_sub": ["rtsp://user:pass@camera/sub"],
            "driveway": ["rtsp://user:pass@camera2/main"],
            "driveway_sub": ["rtsp://user:pass@camera2/sub"],
            "garden_live": ["rtsp://user:pass@camera3/main"],
            "garden_low": ["rtsp://user:pass@camera3/sub"],
        }
    },
    "cameras": {
        # live.streams names the main and sub streams (Frigate 0.14 and later).
        "front_door": {
            "enabled": True,
            "detect": {"width": 1280, "height": 960},
            "live": {"streams": {"Main": "front_door", "Sub": "front_door_sub"}},
            "objects": {"track": ["person", "car", "package"]},
            "onvif": {"host": "", "port": 8000},
        },
        # No live.streams: the go2rtc stream named after the camera, and <camera>_sub.
        "driveway": {
            "detect": {"width": 1280, "height": 720},
            "live": {"streams": {}},
            "objects": {"track": ["person", "car"]},
            "onvif": {"host": "192.168.1.30", "port": 8000},
        },
        # live.streams named differently from the camera.
        "garden": {
            "detect": {"width": 640, "height": 360},
            "live": {"streams": {"HD": "garden_live", "SD": "garden_low"}},
            "objects": {"track": ["person", "cat"]},
            "onvif": {"host": ""},
        },
        # Recorded by Frigate, but not in go2rtc: it can't be watched live.
        "shed": {
            "detect": {"width": 640, "height": 480},
            "live": {"streams": {}},
            "objects": {"track": ["person"]},
        },
    },
}
