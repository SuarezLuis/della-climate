# Della Climate

An Umbrel app that steers a Della mini-split (or any Tuya-based mini-split) from a room temperature sensor.

The mini-split measures air at the indoor unit, near the ceiling, so it often stops early or runs long. This app reads a sensor where you actually sit and moves the unit's setpoint up or down one degree at a time until the room matches your target.

## How steering works

Every minute the app reads the room sensor and the mini-split, saves both, and decides:

- Room warmer than target by more than the deadband: lower the setpoint one degree.
- Room cooler than target by more than the deadband: raise it one degree.
- Otherwise leave it alone.

It never moves the setpoint more than the largest offset away from the target, waits at least the set number of minutes between changes (10 by default, so the compressor doesn't short cycle), and never turns the unit on or off. If the sensor stops answering, the setpoint goes back to the plain target. Changing the target resets the setpoint to it.

## Setup

1. **Get the mini-split's local key.** Tuya units encrypt local traffic with a per-device key that only Tuya's cloud hands out:
   - Create a free account at [iot.tuya.com](https://iot.tuya.com), create a Cloud project, and link your Smart Life (or Della) app account to it by scanning the QR code under Devices → Link App Account.
   - On a computer: `pip install tinytuya`, then `python -m tinytuya wizard`. It lists every device with its ID, IP, and local key.
   - Removing and re-adding the unit in the phone app gives it a new key. Run the wizard again if that happens.
2. **Set up a room sensor.** Any ESPHome sensor with `web_server` turned on works. For example, an ESP32 with an SHT31:

   ```yaml
   web_server:
     port: 80
   i2c:
     sda: GPIO21
     scl: GPIO22
   sensor:
     - platform: sht3xd
       temperature:
         name: "Room Temperature"
         id: room_temperature
       update_interval: 30s
   ```

   Open `http://<sensor-ip>/sensor/room_temperature` in a browser. It should show JSON with a `value`. Use the IP address, not a `.local` name, because the app's container can't resolve those.
3. **Fill in Settings in the app:** the unit's IP, device ID, local key, and protocol version (Della units on current firmware use 3.5), then the sensor URL.
4. **Check the data points.** Settings shows what the unit reports, for example `{"1": true, "2": 23, "3": 25, "4": "cold"}`. The defaults (1 power, 2 setpoint, 3 the unit's own reading) fit most Tuya mini-splits. If yours differ, change a setting in the Della app and watch which number moves. Set "Its temperature unit" and "How it sends temperatures" to match.
5. Turn on **Steer the mini-split from the room sensor**.

## Development

Node 26, npm workspaces (`server/`, `web/`). Fastify with a small JSON API, SQLite through Node's built-in `node:sqlite`, `tuyapi` for the unit, React + Mantine for the page.

```sh
npm install
npm run dev        # server on :4646, web on :5173
npm test
npm run typecheck
npm run build
```

## Release

CI builds `ghcr.io/suarezluis/della-climate` for amd64 and arm64: `edge` on every `master` push, `X.Y.Z` on a `vX.Y.Z` tag. The Umbrel store entry lives in [SuarezLuis/umbrel-apps](https://github.com/SuarezLuis/umbrel-apps) as `sz-della-climate`. Bump its image tag and `version` together.
