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
