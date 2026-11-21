import { describe, expect, it } from "vitest";
import { nextSetpoint, steering, type ControlInput } from "./control";

const input = (overrides: Partial<ControlInput>): ControlInput => ({
  room: 74,
  target: 74,
  deadband: 0.5,
  base: 23,
  current: 23,
  maxOffset: 3,
  sinceChangeMs: 600_000,
  minIntervalMs: 600_000,
  ...overrides,
});

describe("nextSetpoint", () => {
  it("holds inside the deadband", () => {
    expect(nextSetpoint(input({ room: 74.4 }))).toBe(23);
    expect(nextSetpoint(input({ room: 73.6 }))).toBe(23);
  });

  it("lowers the setpoint one degree when the room is too warm", () => {
    expect(nextSetpoint(input({ room: 75 }))).toBe(22);
  });

  it("raises the setpoint one degree when the room is too cold", () => {
    expect(nextSetpoint(input({ room: 73 }))).toBe(24);
  });

  it("never moves past the allowed offset", () => {
    expect(nextSetpoint(input({ room: 80, current: 20 }))).toBe(20);
    expect(nextSetpoint(input({ room: 60, current: 26 }))).toBe(26);
  });

  it("pulls a setpoint changed elsewhere back inside the offset", () => {
    expect(nextSetpoint(input({ room: 74, current: 16 }))).toBe(20);
  });

  it("waits out the minimum interval between changes", () => {
    expect(nextSetpoint(input({ room: 80, sinceChangeMs: 300_000 }))).toBe(23);
  });

  it("falls back to the plain target without a room reading", () => {
    expect(nextSetpoint(input({ room: null, current: 20, sinceChangeMs: 0 }))).toBe(23);
  });
});

describe("steering", () => {
  const state = { enabled: true, power: true, room: 75, offset: 0 };

  it("names what is being sent", () => {
    expect(steering({ ...state, offset: -2 })).toBe("cooler");
    expect(steering({ ...state, offset: 1 })).toBe("warmer");
    expect(steering(state)).toBe("holding");
  });

  it("says why nothing is being steered", () => {
    expect(steering({ ...state, enabled: false })).toBe("watching");
    expect(steering({ ...state, power: null, offset: null })).toBe("unreachable");
    expect(steering({ ...state, power: false })).toBe("off");
    expect(steering({ ...state, room: null })).toBe("no-sensor");
  });
});
