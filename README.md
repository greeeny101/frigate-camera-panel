# Frigate camera panel for Home Assistant

[![Open Frigate camera panel in HACS on your Home Assistant](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=greeeny101&repository=frigate-camera-panel&category=integration)

A full-screen, phone-first view of your [Frigate](https://frigate.video) cameras in Home Assistant: live video, two-way
talk, pan/tilt/zoom, and a feed of what Frigate has seen, with tap-to-play clips. It has its own place in the
sidebar and in the Companion app, and opens from a dashboard button or a notification on the camera you want.

It finds your cameras through the Frigate integration, so there's no YAML to write.

## What it does

- **Live video** through Frigate's go2rtc, over WebRTC, through Home Assistant, so Frigate's own port never has to
  be opened. Swipe or tap to switch cameras.
- **Talk** to whoever is at the door, on cameras with a speaker (see [Talking through a camera](#talking-through-a-camera)).
- **Saves mobile data:** on mobile data or away from home it switches to each camera's lighter stream (a substream).
- **Pan, tilt and zoom**, and one-tap presets, on cameras Frigate controls over ONVIF.
- **Activity:** what Frigate has seen on the camera, with a thumbnail. Tap one to play its clip.
- **Doorbell:** when the doorbell is pressed, an open panel switches to the doorbell camera and shows a banner. With
  the [doorbell blueprint](#notifications-that-open-the-panel), phones get a notification and the panel opens by itself.
- **For everyone in the house:** it works for users who aren't administrators.
- **Its own look**, or your Home Assistant theme, light or dark.

## Requirements

- Home Assistant 2026.10 or later.
- Frigate 0.14 or later, with its cameras in go2rtc (Frigate's `go2rtc:` section).
- The [Frigate integration](https://github.com/blakeblackshear/frigate-hass-integration), set up.
- For talking: HTTPS (browsers only allow the microphone on secure pages), and a camera with a speaker.

## Install

### From the Marketplace (Home Assistant 2026.11 and later)

Frigate camera panel isn't in the Marketplace's list yet, so add it first: go to **Settings → Marketplace**, select
**Add from link**, and enter `https://github.com/greeeny101/frigate-camera-panel`. Then:

1. Search for **Frigate camera panel** and select **Install**. It goes straight on to setting it up (see
   [Set up](#set-up)).

### With HACS (Home Assistant 2026.10)

1. In HACS, open the ⋮ menu → **Custom repositories**, and add `https://github.com/greeeny101/frigate-camera-panel`
   as an **Integration**. Or click the blue button at the top of this page.
2. Search for **Frigate camera panel**, and download it.
3. Restart Home Assistant.

### By hand

Copy `custom_components/frigate_camera_panel` from this repository to your Home Assistant `config/custom_components/`
folder, then restart Home Assistant.

## Set up

1. **Settings → Devices & services → Add integration → Frigate camera panel.** With one Frigate instance it's set up
   straight away; with more, choose one (each gets its own panel).
2. **Cameras** appears in the sidebar, with every camera Frigate's go2rtc has a stream for. Reload the page if it
   isn't there yet.

To change anything, go to **Settings → Devices & services → Frigate camera panel → Configure**. Changes show after
the page is reloaded.

- **Panel:** the address (`cameras`, for `/cameras`), whether it's in the sidebar, its title, its look, when to use
  the lighter streams, how long clips run, and whether to show the stream's resolution and bitrate.
- **Cameras:** which of Frigate's cameras the panel shows.
- **Camera settings:** one camera at a time. Each setting starts from what Frigate's config says, and only what you
  change is kept, so later changes in Frigate still come through.
  - **Name** shown in the panel.
  - **Stream** to watch and talk through, and a **lighter stream** for saving data. Found from the camera's
    `live: streams:` in Frigate, or a go2rtc stream named after the camera (and `<camera>_sub`).
  - **Talk:** off until you turn it on, since it needs the camera's speaker set up in go2rtc (below).
  - **Pan, tilt and zoom:** on for cameras with ONVIF set up in Frigate. **Presets** are Frigate's names for them.
  - **Activity shows only:** some of the objects Frigate tracks, e.g. person and car. Blank: everything.
  - **Picture shape:** from the camera's detect resolution, e.g. 16/9.
  - **Doorbell press sensor:** when it turns on, an open panel switches to this camera.

When Frigate's config changes (a new camera, say), the panel picks it up the next time the Frigate integration is
reloaded.

## Opening the panel from a dashboard or a link

The panel opens at `/cameras`. Add to the address:

- `?camera=<name>` to open on a camera: its Frigate name, stream name or display name, e.g. `/cameras?camera=front_door`.
- `?kiosk=1` to hide Home Assistant's header.

A dashboard button:

```yaml
type: button
name: Front door
icon: mdi:doorbell-video
tap_action:
  action: navigate
  navigation_path: /cameras?camera=front_door&kiosk=1
```

To keep the panel out of the sidebar and open it only from links, untick **Show in the sidebar** under
Configure → Panel.

## Talking through a camera

Phones and browsers can't speak RTSP, so talking goes:

    phone mic → WebRTC → go2rtc (in Frigate) → RTSP backchannel → camera speaker

The signalling goes through the Frigate integration's proxy in Home Assistant, so it's signed in and Frigate never
has to be exposed. The sound itself goes straight between the phone and go2rtc on port 8555.

1. **Give the camera's go2rtc stream an RTSP source**, which is where the speaker is. go2rtc only opens it while
   someone talks, so a camera watched over another source (FLV, HTTP) can keep it. For example, a Reolink doorbell:

   ```yaml
   go2rtc:
     streams:
       front_door:
         - "ffmpeg:http://192.168.1.50/flv?port=1935&app=bcs&stream=channel0_main.bcs&user={FRIGATE_CAMERA_USER}&password={FRIGATE_CAMERA_PASSWORD}#video=copy#audio=copy#audio=opus"
         - rtsp://{FRIGATE_CAMERA_USER}:{FRIGATE_CAMERA_PASSWORD}@192.168.1.50:554/Preview_01_sub
     webrtc:
       candidates:
         - 192.168.1.20:8555   # the Frigate host's address on your network
         - stun:8555            # lets go2rtc find your public address, for talking away from home
   ```

2. **Map port 8555** (TCP and UDP) on the Frigate container.
3. **Turn Talk on** for the camera, under Configure → Camera settings.
4. **Use HTTPS.** Browsers only allow the microphone on secure pages. Video and activity work without it.

To talk with the lighter picture (Configure → Panel → **Picture while talking**), give the camera's lighter stream
the same RTSP source, so go2rtc can reach the speaker from it too. If that stream won't connect, the panel talks
with the full picture instead.

If talking connects but the camera stays silent, update the camera's firmware: RTSP two-way audio needs a fairly
recent one.

**Away from home**, port 8555 has to be reachable: forward it on your router, or use a VPN such as Tailscale, so the
phone is effectively at home.

## Notifications that open the panel

Two blueprints, for Android phones with the Home Assistant app. Both open the panel on the right camera.

[![Import the doorbell blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fgreeeny101%2Ffrigate-camera-panel%2Fblob%2Fmain%2Fblueprints%2Fdoorbell_press.yaml)
**Doorbell press:** each phone gets a notification with a snapshot, and the panel opens by itself on the doorbell
camera. The first time, each phone asks to "Display over other apps" ("Appear on top" on Samsung phones): allow it,
or the panel only opens when the notification is tapped. iPhones get the notification only.

[![Import the camera detections blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fgreeeny101%2Ffrigate-camera-panel%2Fblob%2Fmain%2Fblueprints%2Fcamera_detections.yaml)
**Camera detections:** a notification when Frigate sees people (as alerts, so its required zones apply), named things
(sub labels, such as a pet) or chosen objects. Tapping it opens the panel on that camera; it never opens by itself.
With People set to "unknown", it waits a few seconds for face recognition and leaves out people Frigate recognises.

Then create an automation from each under **Settings → Automations & scenes → Blueprints**. Set the panel address
if it isn't `/cameras`.

## Moving from the YAML setup

Skip this unless you set the panel up by hand, as `doorbell-panel` in a `panel_custom` entry.

1. Install the integration and set it up as above. If your old panel is at `/cameras` too, the integration leaves it
   alone and says so in the log: choose another address under Configure → Panel, or carry on.
2. Under Configure → Camera settings, set what your YAML had for each camera: talk, the doorbell sensor, labels,
   presets. Names and streams usually come out right by themselves.
3. Remove the `doorbell-panel` entry from `panel_custom` in `configuration.yaml`, and restart Home Assistant.
4. Delete the old file from `www/`, and change any links from the old address (such as `/doorbell`) to the new one,
   in dashboards and notification automations.
5. Fully close and reopen the Companion app.

## Setting the panel up in YAML instead

For a panel the integration doesn't set up (untick **Set up the panel**), register it yourself. Build the panel
(`npm run build:www`, see [Development](#development)) or copy `custom_components/frigate_camera_panel/frontend/frigate-camera-panel.js`
to `config/www/frigate-camera-panel/`, then:

```yaml
panel_custom:
  - name: frigate-camera-panel
    sidebar_title: Cameras
    sidebar_icon: mdi:cctv
    url_path: cameras
    module_url: /local/frigate-camera-panel/frigate-camera-panel.js?v=1   # change ?v= after every update
    config:
      frigate_instance: frigate      # Frigate's MQTT client_id (the default is frigate)
      theme: porch                   # porch (the panel's own look) or ha (your Home Assistant theme)
      low_bandwidth: auto            # auto, mobile, always or never
      talk_quality: same             # same, or sd to talk on the lighter stream
      show_stats: false
      clip_padding: {before: 3, after: 3, min: 6}
      cameras:
        - name: Front door
          stream: front_door         # go2rtc stream
          stream_low: front_door_sub # optional
          camera: front_door         # Frigate camera name, for activity
          aspect_ratio: "4/3"
          talk: true
          labels: [person, car]      # optional: what activity shows
          doorbell_entity: binary_sensor.front_door_visitor
        - name: Driveway
          stream: driveway
          camera: driveway
          ptz:
            entity: camera.driveway  # the Frigate camera entity
            presets: [gate, street]
```

The options are described in `src/types.ts`.

## Troubleshooting

**The panel isn't at /cameras.** Look in the Home Assistant log for "Not adding the camera panel": another panel
already has that address, usually a `panel_custom` entry in `configuration.yaml`. Remove that one, or choose another
address under Configure → Panel.

**A camera is missing.** The panel shows only cameras with a stream in Frigate's go2rtc, and only the ones ticked
under Configure → Cameras. A camera added to Frigate shows up once the Frigate integration has been reloaded.

**The video won't start.** Check that the stream plays in Frigate's own Live view, and that the camera's stream under
Configure → Camera settings is the right go2rtc stream.

**Talking doesn't work.** See [Talking through a camera](#talking-through-a-camera): HTTPS, the RTSP source, port
8555, and the camera's firmware.

**The panel looks old after an update.** Reload the page (on the Companion app, close it fully and reopen it).

## Limitations

- **Frigate only.** The cameras, streams and activity all come from Frigate.
- **Notifications are for Android.** The blueprints use the Home Assistant app's Android features (opening the panel,
  notification channels). iPhones get a plain notification from the doorbell blueprint.
- **Talk needs a camera go2rtc can send sound to** over RTSP (most Reolink cameras with a speaker can).

## Development

```sh
npm install
npm run build        # builds the panel into custom_components/frigate_camera_panel/frontend/
npm run typecheck
npm test             # the panel's tests (npm run test:watch to rerun on save)
npm run test:py      # the integration's plain-Python parts: Frigate's cameras and the panel's config (python3 -m venv .venv && .venv/bin/pip install pytest pytest-asyncio first)
```

The built panel is committed, because the Marketplace (and HACS) install the integration straight from the
repository. The tests workflow fails if it doesn't match the source, so run `npm run build` before committing.

The panel's tests run in happy-dom, a lightweight browser, with a fake Home Assistant and a fake go2rtc connection, so
they need no cameras or phone. They cover the stream connection (signalling, failures, disconnecting), links, the
lighter streams, the doorbell switching cameras, activity and clips, and that the microphone is only on while
talking and the sound stops whenever the panel leaves the screen. What only a real phone can check (video, sound,
layout) still needs a phone: test in Chrome or Safari first, then in the Companion app.

`tests/` runs the integration inside a test Home Assistant
([pytest-homeassistant](https://github.com/home-assistant/core/tree/dev/packages/pytest-homeassistant), Home
Assistant's own test package), with a made-up Frigate integration entry: setting up, finding the cameras, the
Configure pages, renames, and Frigate being reloaded. The tests workflow runs it against the newest Home Assistant
release and the newest beta, every push and every Thursday morning. It needs Python 3.14; with Docker:

```sh
docker run --rm -v "$PWD:/repo" -w /repo -e PYTHONDONTWRITEBYTECODE=1 python:3.14 sh -c 'pip install -q -r requirements_test.txt &&
  pip install -q $(python tests/ha_requirements.py) && python -m pytest -p no:cacheprovider tests -q'
```

### Releasing

1. Change `version` in `custom_components/frigate_camera_panel/manifest.json` (and `package.json`).
2. `npm run build`, run the tests, and commit.
3. Make a GitHub release (not just a tag) named after the version, without a "v", e.g. `0.1.0`. The Marketplace (and
   HACS) offer each release as an update. Tick **Set as a pre-release** for one only people who've asked for beta
   versions should get.
