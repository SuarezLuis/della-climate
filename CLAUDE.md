# CLAUDE.md

Della Climate: personal Umbrel app that steers a Tuya-based Della mini-split from an ESPHome room sensor. Owner: SuarezLuis. Setup, how steering works, and release steps are in `README.md`.

- `server/src/loop.ts` runs once a minute: read the sensor (`sensor.ts`), connect to the unit (`della.ts`, `tuyapi`), decide (`control.ts`, pure), write, record to SQLite (`db.ts`, `node:sqlite`). `index.ts` is the whole HTTP API.
- Readings are stored in °C; settings hold the target and deadband in the display unit. The web converts both when the display unit changes.
- No login of its own: Umbrel's app proxy handles it, so the container runs on Umbrel's bridge network, not the host network.
- The owner's unit speaks Tuya protocol 3.5. Its data point numbers were unconfirmed at the start (no local key yet).
- npm 11 blocks install scripts; approved ones are pinned in root `package.json` `allowScripts`.
- Always branch and open a PR; the owner merges. Leave one small test behind for non-trivial logic.
