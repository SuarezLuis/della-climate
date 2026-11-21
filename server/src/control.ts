export type ControlInput = {
  room: number | null;
  target: number;
  deadband: number;
  base: number;
  current: number;
  maxOffset: number;
  sinceChangeMs: number;
  minIntervalMs: number;
};

// Too warm means a lower setpoint and too cold a higher one, in heat, cool and auto alike
export const nextSetpoint = (input: ControlInput): number => {
  if (input.room === null) return input.base;
  if (input.sinceChangeMs < input.minIntervalMs) return input.current;
  const error = input.room - input.target;
  const step = error > input.deadband ? -1 : error < -input.deadband ? 1 : 0;
  const lowest = input.base - input.maxOffset;
  const highest = input.base + input.maxOffset;
  return Math.min(highest, Math.max(lowest, input.current + step));
};

export type Steering = "watching" | "unreachable" | "off" | "no-sensor" | "cooler" | "warmer" | "holding";

// What the app is sending right now; offset is the unit's setpoint minus your target, in the unit's degrees
export const steering = (state: { enabled: boolean; power: boolean | null; room: number | null; offset: number | null }): Steering => {
  if (!state.enabled) return "watching";
  if (state.power === null || state.offset === null) return "unreachable";
  if (!state.power) return "off";
  if (state.room === null) return "no-sensor";
  return state.offset < 0 ? "cooler" : state.offset > 0 ? "warmer" : "holding";
};
