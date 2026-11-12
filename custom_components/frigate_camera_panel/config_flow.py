"""Setting up the Frigate camera panel: one entry per Frigate instance (the Frigate integration's entries).

The options (Configure) set up the panel, choose which of Frigate's cameras it shows, and change a camera's settings
from what Frigate's config says (see panel_config.py).
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigEntryState, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    CONF_ASPECT_RATIO,
    CONF_CAMERA,
    CONF_CAMERAS,
    CONF_CLIP_AFTER,
    CONF_CLIP_BEFORE,
    CONF_CLIP_MIN,
    CONF_DOORBELL_ENTITY,
    CONF_FRIGATE_ENTRY,
    CONF_HIDDEN,
    CONF_HOME_HOSTS,
    CONF_LABELS,
    CONF_LOW_BANDWIDTH,
    CONF_NAME,
    CONF_PANEL,
    CONF_PRESETS,
    CONF_PTZ,
    CONF_SHOW_STATS,
    CONF_SIDEBAR,
    CONF_STREAM,
    CONF_STREAM_LOW,
    CONF_TALK,
    CONF_TALK_QUALITY,
    CONF_THEME,
    CONF_URL_PATH,
    DEFAULT_NAME,
    DEFAULT_URL_PATH,
    DOMAIN,
    FRIGATE_DOMAIN,
)
from .frigate import FrigateCamera, cameras, go2rtc_streams
from .panel import frigate_config
from .panel_config import (
    ASPECT_RATIO,
    CLIP_DEFAULTS,
    LOW_BANDWIDTH,
    TALK_QUALITY,
    THEMES,
    camera_settings,
    split_list,
    url_path_error,
)

ASPECT_RATIOS = ["16/9", "4/3", "3/2", "1/1", "9/16", "3/4"]


def _url_paths(flow: ConfigFlow | OptionsFlow, but: ConfigEntry | None = None) -> set[str]:
    """The addresses other entries' panels have."""
    return {
        e.options.get(CONF_URL_PATH) or DEFAULT_URL_PATH
        for e in flow.hass.config_entries.async_entries(DOMAIN)
        if e is not but and e.options.get(CONF_PANEL, True)
    }


class FrigateCameraPanelConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return FrigateCameraPanelOptionsFlow()

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        frigates = {
            e.entry_id: e.title
            for e in self.hass.config_entries.async_entries(FRIGATE_DOMAIN)
            if e.state is ConfigEntryState.LOADED
        }
        if not frigates:
            return self.async_abort(reason="no_frigate")
        configured = {e.unique_id for e in self._async_current_entries()}
        available = {k: v for k, v in frigates.items() if k not in configured}
        if not available:
            return self.async_abort(reason="already_configured")
        if user_input is not None or len(available) == 1:
            frigate_entry_id = user_input[CONF_FRIGATE_ENTRY] if user_input else next(iter(available))
            await self.async_set_unique_id(frigate_entry_id)
            self._abort_if_unique_id_configured()
            # /cameras, or /cameras-2 and so on for more Frigate instances.
            taken = _url_paths(self)
            paths = (DEFAULT_URL_PATH if n == 1 else f"{DEFAULT_URL_PATH}-{n}" for n in range(1, 100))
            path = next(p for p in paths if p not in taken)
            return self.async_create_entry(
                title=available[frigate_entry_id],
                data={CONF_FRIGATE_ENTRY: frigate_entry_id},
                options={CONF_PANEL: True, CONF_URL_PATH: path},
            )
        options = [selector.SelectOptionDict(value=k, label=v) for k, v in available.items()]
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_FRIGATE_ENTRY): selector.SelectSelector(
                        selector.SelectSelectorConfig(options=options)
                    )
                }
            ),
        )


def _number(minimum: float, maximum: float, step: float, unit: str | None = None) -> selector.NumberSelector:
    config = selector.NumberSelectorConfig(min=minimum, max=maximum, step=step, mode=selector.NumberSelectorMode.BOX)
    # A unit of None is refused (it must be text), so leave it out when there isn't one.
    if unit:
        config["unit_of_measurement"] = unit
    return selector.NumberSelector(config)


def _select(options: list[str], key: str) -> selector.SelectSelector:
    return selector.SelectSelector(selector.SelectSelectorConfig(options=options, translation_key=key))


def _choices(values: list[str], custom: bool = False, multiple: bool = False) -> selector.SelectSelector:
    """A list to pick from that needs no translations: stream names, objects, picture shapes."""
    return selector.SelectSelector(
        selector.SelectSelectorConfig(
            options=values, custom_value=custom, multiple=multiple, mode=selector.SelectSelectorMode.DROPDOWN
        )
    )


class FrigateCameraPanelOptionsFlow(OptionsFlow):
    """The panel, which cameras it shows, and each camera's settings."""

    _camera: FrigateCamera

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        return self.async_show_menu(step_id="init", menu_options=["panel", "cameras", "camera"])

    def _frigate(self) -> dict[str, Any] | None:
        return frigate_config(self.hass, self.config_entry.data[CONF_FRIGATE_ENTRY])

    def _save(self, changes: dict[str, Any], keys: set[str]) -> ConfigFlowResult:
        """Keep the other pages' options; an optional field left blank is dropped."""
        kept = {k: v for k, v in self.config_entry.options.items() if k not in keys}
        return self.async_create_entry(data={**kept, **changes})

    async def async_step_panel(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            path = user_input[CONF_URL_PATH] = user_input[CONF_URL_PATH].strip().strip("/").lower()
            if error := url_path_error(path, _url_paths(self, self.config_entry)):
                errors[CONF_URL_PATH] = error
            else:
                hosts = split_list(user_input.pop(CONF_HOME_HOSTS, ""))
                return self._save({**user_input, **({CONF_HOME_HOSTS: hosts} if hosts else {})}, PANEL_KEYS)

        o = {**self.config_entry.options, **(user_input or {})}
        hosts = o.get(CONF_HOME_HOSTS) or []
        schema = vol.Schema(
            {
                vol.Required(CONF_PANEL, default=o.get(CONF_PANEL, True)): bool,
                vol.Required(CONF_URL_PATH, default=o.get(CONF_URL_PATH) or DEFAULT_URL_PATH): str,
                vol.Required(CONF_SIDEBAR, default=o.get(CONF_SIDEBAR, True)): bool,
                vol.Required(CONF_NAME, default=o.get(CONF_NAME) or DEFAULT_NAME): str,
                vol.Required(CONF_THEME, default=o.get(CONF_THEME, THEMES[0])): _select(THEMES, CONF_THEME),
                vol.Required(CONF_LOW_BANDWIDTH, default=o.get(CONF_LOW_BANDWIDTH, LOW_BANDWIDTH[0])): _select(
                    LOW_BANDWIDTH, CONF_LOW_BANDWIDTH
                ),
                vol.Optional(
                    CONF_HOME_HOSTS,
                    description={"suggested_value": hosts if isinstance(hosts, str) else ", ".join(hosts)},
                ): str,
                vol.Required(CONF_TALK_QUALITY, default=o.get(CONF_TALK_QUALITY, TALK_QUALITY[0])): _select(
                    TALK_QUALITY, CONF_TALK_QUALITY
                ),
                vol.Required(CONF_SHOW_STATS, default=o.get(CONF_SHOW_STATS, False)): bool,
                **{
                    vol.Required(key, default=o.get(key, CLIP_DEFAULTS[key])): _number(0, 60, 1, "s")
                    for key in (CONF_CLIP_BEFORE, CONF_CLIP_AFTER, CONF_CLIP_MIN)
                },
            }
        )
        return self.async_show_form(step_id="panel", data_schema=schema, errors=errors)

    async def async_step_cameras(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if (config := self._frigate()) is None:
            return self.async_abort(reason="frigate_not_ready")
        found = cameras(config)
        if user_input is not None:
            shown = set(user_input[CONF_CAMERAS])
            return self._save({CONF_HIDDEN: [c.name for c in found if c.name not in shown]}, {CONF_HIDDEN})

        hidden = set(self.config_entry.options.get(CONF_HIDDEN, []))
        options = [selector.SelectOptionDict(value=c.name, label=c.title) for c in found]
        schema = vol.Schema(
            {
                vol.Required(
                    CONF_CAMERAS, default=[c.name for c in found if c.name not in hidden]
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(options=options, multiple=True, mode=selector.SelectSelectorMode.LIST)
                )
            }
        )
        return self.async_show_form(step_id="cameras", data_schema=schema)

    async def async_step_camera(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if (config := self._frigate()) is None:
            return self.async_abort(reason="frigate_not_ready")
        found = {c.name: c for c in cameras(config)}
        if user_input is not None:
            self._camera = found[user_input[CONF_CAMERA]]
            return await self.async_step_camera_settings()

        names = self.config_entry.options.get(CONF_CAMERAS, {})
        options = [
            selector.SelectOptionDict(value=c.name, label=names.get(c.name, {}).get(CONF_NAME) or c.title)
            for c in found.values()
        ]
        schema = vol.Schema(
            {vol.Required(CONF_CAMERA): selector.SelectSelector(selector.SelectSelectorConfig(options=options))}
        )
        return self.async_show_form(step_id="camera", data_schema=schema)

    async def async_step_camera_settings(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        camera = self._camera
        frigate = camera_settings(camera, {})
        errors: dict[str, str] = {}
        if user_input is not None:
            ratio = (user_input.get(CONF_ASPECT_RATIO) or "").replace(" ", "")
            if ratio and not ASPECT_RATIO.match(ratio):
                errors[CONF_ASPECT_RATIO] = "aspect_ratio_invalid"
            else:
                chosen = {
                    CONF_NAME: user_input[CONF_NAME].strip() or camera.title,
                    CONF_STREAM: user_input.get(CONF_STREAM) or frigate[CONF_STREAM],
                    CONF_STREAM_LOW: user_input.get(CONF_STREAM_LOW) or None,
                    CONF_TALK: user_input[CONF_TALK],
                    CONF_PTZ: user_input[CONF_PTZ],
                    CONF_PRESETS: split_list(user_input.get(CONF_PRESETS)),
                    CONF_LABELS: user_input.get(CONF_LABELS) or [],
                    CONF_ASPECT_RATIO: ratio or frigate[CONF_ASPECT_RATIO],
                    CONF_DOORBELL_ENTITY: user_input.get(CONF_DOORBELL_ENTITY) or None,
                }
                # Only what differs from Frigate's config is kept, so later changes there still come through.
                changed = {k: v for k, v in chosen.items() if v != frigate[k]}
                all_cameras = {**self.config_entry.options.get(CONF_CAMERAS, {})}
                if changed:
                    all_cameras[camera.name] = changed
                else:
                    all_cameras.pop(camera.name, None)
                return self._save({CONF_CAMERAS: all_cameras}, {CONF_CAMERAS})

        s = {**camera_settings(camera, dict(self.config_entry.options)), **(user_input or {})}
        streams = go2rtc_streams(self._frigate() or {})

        def suggested(key: str) -> dict[str, Any]:
            value = s.get(key)
            return {"suggested_value": ", ".join(value) if key == CONF_PRESETS else value}

        schema = vol.Schema(
            {
                vol.Required(CONF_NAME, default=s[CONF_NAME] or camera.title): str,
                vol.Optional(CONF_STREAM, description=suggested(CONF_STREAM)): _choices(streams, custom=True),
                # Optional with a suggestion rather than a default, so it can be cleared (no lighter stream).
                vol.Optional(CONF_STREAM_LOW, description=suggested(CONF_STREAM_LOW)): _choices(streams, custom=True),
                vol.Required(CONF_TALK, default=bool(s[CONF_TALK])): bool,
                vol.Required(CONF_PTZ, default=bool(s[CONF_PTZ])): bool,
                vol.Optional(CONF_PRESETS, description=suggested(CONF_PRESETS)): str,
                vol.Optional(CONF_LABELS, description=suggested(CONF_LABELS)): _choices(
                    sorted({*camera.labels, *(s[CONF_LABELS] or [])}), custom=True, multiple=True
                ),
                vol.Optional(CONF_ASPECT_RATIO, description=suggested(CONF_ASPECT_RATIO)): _choices(
                    ASPECT_RATIOS, custom=True
                ),
                vol.Optional(
                    CONF_DOORBELL_ENTITY, description=suggested(CONF_DOORBELL_ENTITY)
                ): selector.EntitySelector(selector.EntitySelectorConfig(domain="binary_sensor")),
            }
        )
        return self.async_show_form(
            step_id="camera_settings",
            data_schema=schema,
            errors=errors,
            description_placeholders={"camera": camera.name},
        )


PANEL_KEYS = {
    CONF_PANEL, CONF_URL_PATH, CONF_SIDEBAR, CONF_NAME, CONF_THEME, CONF_LOW_BANDWIDTH, CONF_HOME_HOSTS,
    CONF_TALK_QUALITY, CONF_SHOW_STATS, CONF_CLIP_BEFORE, CONF_CLIP_AFTER, CONF_CLIP_MIN,
}  # fmt: skip
