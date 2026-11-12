"""Constants for the Frigate camera panel integration."""

import logging

DOMAIN = "frigate_camera_panel"
LOGGER = logging.getLogger(__package__)

# The Frigate integration this panel shows the cameras of.
FRIGATE_DOMAIN = "frigate"
CONF_FRIGATE_ENTRY = "frigate_entry_id"

# Panel options (config entry options; see panel.py and panel_config.py)
CONF_PANEL = "panel"
CONF_URL_PATH = "url_path"
CONF_SIDEBAR = "sidebar"
CONF_NAME = "name"
CONF_THEME = "theme"
CONF_LOW_BANDWIDTH = "low_bandwidth"
CONF_HOME_HOSTS = "home_hosts"
CONF_TALK_QUALITY = "talk_quality"
CONF_SHOW_STATS = "show_stats"
CONF_CLIP_BEFORE = "clip_before"
CONF_CLIP_AFTER = "clip_after"
CONF_CLIP_MIN = "clip_min"
DEFAULT_URL_PATH = "cameras"
DEFAULT_NAME = "Cameras"

# Camera options: which Frigate cameras are left out, and each camera's own settings, by Frigate camera name.
CONF_HIDDEN = "hidden"
CONF_CAMERAS = "cameras"
CONF_CAMERA = "camera"
CONF_STREAM = "stream"
CONF_STREAM_LOW = "stream_low"
CONF_TALK = "talk"
CONF_PTZ = "ptz"
CONF_PRESETS = "presets"
CONF_LABELS = "labels"
CONF_ASPECT_RATIO = "aspect_ratio"
CONF_DOORBELL_ENTITY = "doorbell_entity"

# The panel's element (customElements.define in src/frigate-camera-panel.ts) and where its built file is served.
PANEL_ELEMENT = "frigate-camera-panel"
FRONTEND_URL = f"/{DOMAIN}"
PANEL_FILE = "frigate-camera-panel.js"
PANEL_ICON = "mdi:cctv"
