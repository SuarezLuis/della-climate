import { z } from "zod";
import { db } from "./db";
import { convert } from "./units";

const unit = z.enum(["F", "C"]);
const dataPoint = z.string().regex(/^\d{1,3}$/, "Data point numbers are 1 to 3 digits");

export const settingsSchema = z
  .object({
    enabled: z.boolean(),
    unit,
    target: z.number(),
    deadband: z.number().min(0.1).max(5),
    maxOffset: z.number().int().min(1).max(10),
    minIntervalMinutes: z.number().int().min(5).max(120),
    sensor: z.object({
      url: z.union([z.literal(""), z.url({ protocol: /^https?$/ })]),
      unit,
    }),
    device: z.object({
      ip: z.union([z.literal(""), z.ipv4()]),
      id: z.string().max(64),
      key: z.string().max(64),
      version: z.enum(["3.3", "3.4", "3.5"]),
      unit,
      scale: z.union([z.literal(1), z.literal(10)]),
      dps: z.object({ power: dataPoint, setpoint: dataPoint, current: dataPoint }),
    }),
  })
  .refine(
    (settings) => {
      const celsius = convert(settings.target, settings.unit, "C");
      return celsius >= 10 && celsius <= 35;
    },
    { message: "Target must be between 50°F and 95°F (10°C and 35°C)", path: ["target"] },
  );

export type Settings = z.infer<typeof settingsSchema>;
export type PublicSettings = Settings & { hasKey: boolean };

export const DEFAULTS: Settings = {
  enabled: false,
  unit: "F",
  target: 74,
  deadband: 0.5,
  maxOffset: 4,
  minIntervalMinutes: 10,
  sensor: { url: "", unit: "C" },
  device: {
    ip: "",
    id: "",
    key: "",
    version: "3.5",
    unit: "C",
    scale: 1,
    dps: { power: "1", setpoint: "2", current: "3" },
  },
};

const storedRow = z.object({ json: z.string() });

export const loadSettings = (): Settings => {
  const row = db.prepare("SELECT json FROM settings WHERE id = 1").get();
  if (row === undefined) return DEFAULTS;
  return settingsSchema.parse(JSON.parse(storedRow.parse(row).json));
};

// An empty key keeps the saved one, so the page never needs to read the key back
export const saveSettings = (input: Settings): Settings => {
  const current = loadSettings();
  const next: Settings = { ...input, device: { ...input.device, key: input.device.key || current.device.key } };
  db.prepare("INSERT INTO settings (id, json) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json").run(
    JSON.stringify(next),
  );
  return next;
};

export const toPublic = (settings: Settings): PublicSettings => ({
  ...settings,
  device: { ...settings.device, key: "" },
  hasKey: settings.device.key !== "",
});
