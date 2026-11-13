import type { FastifyBaseLogger } from "fastify";
import { nextSetpoint } from "./control";
import { db } from "./db";
import { withDevice, type DataPoints, type Device } from "./della";
import { readSensor } from "./sensor";
import { loadSettings, type Settings } from "./settings";
import { convert, type Unit } from "./units";

export type Status = {
  checkedAt: number | null;
  room: number | null;
  power: boolean | null;
  setpoint: number | null;
  unitReading: number | null;
  lastChangeAt: number | null;
  dps: DataPoints | null;
  errors: string[];
};

type Steered = { dps: DataPoints; setpoint: number; changed: boolean };

const INTERVAL_MS = 60_000;
const RETENTION_MS = 30 * 24 * 3600_000;

let status: Status = {
  checkedAt: null,
  room: null,
  power: null,
  setpoint: null,
  unitReading: null,
  lastChangeAt: null,
  dps: null,
  errors: [],
};
let resetPending = true;
let running = false;

export const getStatus = () => status;

// The next check sets the unit straight to the target, dropping any offset built up so far
export const requestReset = () => {
  resetPending = true;
};

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

const deviceNumber = (dps: DataPoints, dataPoint: string, scale: number) => {
  const raw = dps[dataPoint];
  return typeof raw === "number" ? raw / scale : null;
};

const readRoom = async (settings: Settings) => {
  if (!settings.sensor.url) return null;
  return convert(await readSensor(settings.sensor.url), settings.sensor.unit, settings.unit);
};

export const steer = async (device: Device, settings: Settings, room: number | null, now: number): Promise<Steered> => {
  const { dps: dataPoints, scale, unit } = settings.device;
  const dps = await device.read();
  const current = deviceNumber(dps, dataPoints.setpoint, scale);
  if (current === null) {
    throw new Error(`data point ${dataPoints.setpoint} is not a number, so it is not the setpoint; check the data points in Settings`);
  }
  if (!settings.enabled || dps[dataPoints.power] !== true) return { dps, setpoint: current, changed: false };

  const base = Math.round(convert(settings.target, settings.unit, unit));
  const next = resetPending
    ? base
    : nextSetpoint({
        room,
        target: settings.target,
        deadband: settings.deadband,
        base,
        current,
        maxOffset: settings.maxOffset,
        sinceChangeMs: now - (status.lastChangeAt ?? 0),
        minIntervalMs: settings.minIntervalMinutes * 60_000,
      });
  resetPending = false;
  if (next === current) return { dps, setpoint: current, changed: false };

  await device.write(dataPoints.setpoint, next * scale);
  return { dps: { ...dps, [dataPoints.setpoint]: next * scale }, setpoint: next, changed: true };
};

const record = (now: number, settings: Settings, room: number | null, steered: Steered | null) => {
  const { dps: dataPoints, scale, unit } = settings.device;
  const celsius = (value: number | null, from: Unit) => (value === null ? null : convert(value, from, "C"));
  const unitReading = steered ? deviceNumber(steered.dps, dataPoints.current, scale) : null;
  const power = steered ? Number(steered.dps[dataPoints.power] === true) : null;
  db.prepare("INSERT OR REPLACE INTO readings (ts, room, unit_temp, target, setpoint, power) VALUES (?, ?, ?, ?, ?, ?)").run(
    now,
    celsius(room, settings.unit),
    celsius(unitReading, unit),
    convert(settings.target, settings.unit, "C"),
    celsius(steered?.setpoint ?? null, unit),
    power,
  );
  db.prepare("DELETE FROM readings WHERE ts < ?").run(now - RETENTION_MS);
};

const toStatus = (now: number, settings: Settings, room: number | null, steered: Steered | null, errors: string[]): Status => {
  const { dps: dataPoints, scale, unit } = settings.device;
  const toApp = (value: number | null) => (value === null ? null : convert(value, unit, settings.unit));
  return {
    checkedAt: now,
    room,
    power: steered ? steered.dps[dataPoints.power] === true : null,
    setpoint: toApp(steered?.setpoint ?? null),
    unitReading: toApp(steered ? deviceNumber(steered.dps, dataPoints.current, scale) : null),
    lastChangeAt: steered?.changed ? now : status.lastChangeAt,
    dps: steered?.dps ?? null,
    errors,
  };
};

export const tick = async (log: FastifyBaseLogger) => {
  if (running) return;
  running = true;
  try {
    const settings = loadSettings();
    const now = Date.now();
    const errors: string[] = [];
    const room = await readRoom(settings).catch((error: unknown) => {
      errors.push(`Room sensor: ${message(error)}`);
      return null;
    });
    const { ip, id, key } = settings.device;
    const steered =
      ip && id && key
        ? await withDevice(settings.device, (device) => steer(device, settings, room, now)).catch((error: unknown) => {
            errors.push(`Mini-split: ${message(error)}`);
            return null;
          })
        : null;

    record(now, settings, room, steered);
    status = toStatus(now, settings, room, steered, errors);
    if (errors.length > 0) log.warn({ errors }, "Climate check had errors");
    if (steered?.changed) log.info({ setpoint: steered.setpoint }, "Setpoint changed");
  } finally {
    running = false;
  }
};

export const startLoop = (log: FastifyBaseLogger) => {
  const run = () => tick(log).catch((error: unknown) => log.error({ err: error }, "Climate check failed"));
  void run();
  setInterval(run, INTERVAL_MS);
};
