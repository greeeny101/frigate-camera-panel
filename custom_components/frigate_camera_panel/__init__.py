"""The Frigate camera panel integration: serves the camera panel and registers it for a Frigate instance.

It reads the cameras from the Frigate integration (its copy of Frigate's config; see frigate.py) and registers the
panel with them (see panel.py), so it needs no panel_custom YAML. It waits for the Frigate integration to be set up,
and sets itself up again when Frigate's is reloaded with a changed config.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from homeassistant.config_entries import (
    SIGNAL_CONFIG_ENTRY_CHANGED,
    ConfigEntry,
    ConfigEntryChange,
    ConfigEntryState,
)
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers import config_validation as cv, entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.typing import ConfigType

from . import panel
from .const import CONF_FRIGATE_ENTRY, CONF_PANEL, DOMAIN
from .panel_config import config_entities, renamed_options

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    await panel.async_serve_frontend(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    config = panel.frigate_config(hass, entry.data[CONF_FRIGATE_ENTRY])
    if config is None:
        # Home Assistant tries again shortly: the Frigate integration may simply not be set up yet.
        raise ConfigEntryNotReady("Waiting for the Frigate integration to be set up")
    entry.async_on_unload(entry.add_update_listener(_options_changed))
    panel_entities: set[str] = set()
    if entry.options.get(CONF_PANEL, True) and (registered := await panel.async_register(hass, entry, config)):
        entry.async_on_unload(lambda: panel.remove(hass, entry))
        panel_entities |= config_entities(registered)
    entry.async_on_unload(_follow_renames(hass, entry, panel_entities))
    entry.async_on_unload(_follow_frigate(hass, entry, config))
    return True


@callback
def _follow_renames(hass: HomeAssistant, entry: ConfigEntry, panel_entities: set[str]) -> Callable[[], None]:
    """Keep working when an entity is renamed in Settings → Entities.

    A doorbell sensor chosen in the options is renamed there, which reloads the entry. A camera entity the
    integration found itself only needs the panel registered again with the new name.
    """

    async def register_again() -> None:
        if (config := panel.frigate_config(hass, entry.data[CONF_FRIGATE_ENTRY])) is None:
            return
        panel.remove(hass, entry)
        panel_entities.clear()
        if registered := await panel.async_register(hass, entry, config):
            panel_entities.update(config_entities(registered))

    @callback
    def renamed(event: Event[er.EventEntityRegistryUpdatedData]) -> None:
        data = event.data
        if data["action"] != "update" or "old_entity_id" not in data:
            return
        old, new = data["old_entity_id"], data["entity_id"]
        if (options := renamed_options(dict(entry.options), old, new)) is not None:
            hass.config_entries.async_update_entry(entry, options=options)
        elif old in panel_entities:
            entry.async_create_task(hass, register_again(), f"{DOMAIN} panel after rename")

    return hass.bus.async_listen(er.EVENT_ENTITY_REGISTRY_UPDATED, renamed)


@callback
def _follow_frigate(hass: HomeAssistant, entry: ConfigEntry, config: dict[str, Any]) -> Callable[[], None]:
    """Set up again when the Frigate integration is reloaded with a changed config (cameras added, streams...)."""

    @callback
    def changed(change: ConfigEntryChange, frigate_entry: ConfigEntry) -> None:
        if (
            change is ConfigEntryChange.UPDATED
            and frigate_entry.entry_id == entry.data[CONF_FRIGATE_ENTRY]
            and frigate_entry.state is ConfigEntryState.LOADED
            and panel.frigate_config(hass, frigate_entry.entry_id) not in (None, config)
        ):
            hass.config_entries.async_schedule_reload(entry.entry_id)

    return async_dispatcher_connect(hass, SIGNAL_CONFIG_ENTRY_CHANGED, changed)


async def _options_changed(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    return True
