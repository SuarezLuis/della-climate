export type Unit = "F" | "C";

export const convert = (value: number, from: Unit, to: Unit) => {
  if (from === to) return value;
  return to === "F" ? value * 1.8 + 32 : (value - 32) / 1.8;
};

export const convertDelta = (value: number, from: Unit, to: Unit) => {
  if (from === to) return value;
  return to === "F" ? value * 1.8 : value / 1.8;
};

const roundTo = (value: number, step: number) => Math.round(value / step) / (1 / step);

// Target snaps to the +/− step (1°F, 0.5°C) so flipping units back and forth doesn't drift it
export const switchUnit = <T extends { unit: Unit; target: number; deadband: number }>(settings: T, unit: Unit): T => ({
  ...settings,
  unit,
  target: roundTo(convert(settings.target, settings.unit, unit), unit === "F" ? 1 : 0.5),
  deadband: Math.max(0.1, roundTo(convertDelta(settings.deadband, settings.unit, unit), 0.1)),
});
