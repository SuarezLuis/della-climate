import { z } from "zod";
import { db } from "./db";
import { convert, type Unit } from "./units";

const POINTS = 300;
const nullableNumber = z.number().nullable();
const row = z.object({
  ts: z.number(),
  room: nullableNumber,
  unit_temp: nullableNumber,
  target: nullableNumber,
  setpoint: nullableNumber,
});

export type HistoryPoint = {
  ts: number;
  room: number | null;
  unitReading: number | null;
  target: number | null;
  setpoint: number | null;
};

export const history = (hours: number, unit: Unit): HistoryPoint[] => {
  const bucket = Math.max(60_000, Math.round((hours * 3600_000) / POINTS));
  const rows = db
    .prepare(
      `SELECT ts - (ts % ?) AS bucket_ts, AVG(room) AS room, AVG(unit_temp) AS unit_temp, AVG(target) AS target, AVG(setpoint) AS setpoint
       FROM readings WHERE ts >= ? GROUP BY bucket_ts ORDER BY bucket_ts`,
    )
    .all(bucket, Date.now() - hours * 3600_000)
    .map((stored) => ({ ...stored, ts: stored.bucket_ts }));
  const display = (celsius: number | null) => (celsius === null ? null : Math.round(convert(celsius, "C", unit) * 10) / 10);
  return z
    .array(row)
    .parse(rows)
    .map((point) => ({
      ts: point.ts,
      room: display(point.room),
      unitReading: display(point.unit_temp),
      target: display(point.target),
      setpoint: display(point.setpoint),
    }));
};
