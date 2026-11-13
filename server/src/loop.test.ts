import { beforeEach, describe, expect, it } from "vitest";
import type { DataPoints, Device } from "./della";
import { requestReset, steer } from "./loop";
import { DEFAULTS, type Settings } from "./settings";

const fakeDevice = (dps: DataPoints) => {
  const writes: Array<[string, number]> = [];
  const device: Device = {
    read: async () => dps,
    write: async (dataPoint, value) => {
      writes.push([dataPoint, value]);
    },
  };
  return { device, writes };
};

const settings = (overrides: Partial<Settings> = {}): Settings => ({ ...DEFAULTS, enabled: true, target: 74, ...overrides });

describe("steer", () => {
  beforeEach(requestReset);

  it("sets the target straight away after a reset", async () => {
    const { device, writes } = fakeDevice({ "1": true, "2": 20 });
    const result = await steer(device, settings(), 80, Date.now());
    expect(writes).toEqual([["2", 23]]);
    expect(result.changed).toBe(true);
  });

  it("then nudges the setpoint from the room reading", async () => {
    await steer(fakeDevice({ "1": true, "2": 20 }).device, settings(), 74, Date.now());
    const { device, writes } = fakeDevice({ "1": true, "2": 23 });
    await steer(device, settings(), 76, Date.now());
    expect(writes).toEqual([["2", 22]]);
  });

  it("writes tenths when the unit sends them", async () => {
    const { device, writes } = fakeDevice({ "1": true, "2": 200 });
    await steer(device, settings({ device: { ...DEFAULTS.device, scale: 10 } }), 74, Date.now());
    expect(writes).toEqual([["2", 230]]);
  });

  it("leaves the unit alone when steering is off or the unit is off", async () => {
    const off = fakeDevice({ "1": false, "2": 20 });
    await steer(off.device, settings(), 80, Date.now());
    const disabled = fakeDevice({ "1": true, "2": 20 });
    await steer(disabled.device, settings({ enabled: false }), 80, Date.now());
    expect([...off.writes, ...disabled.writes]).toEqual([]);
  });

  it("refuses a setpoint data point that is not a number", async () => {
    const { device } = fakeDevice({ "1": true, "2": "cold" });
    await expect(steer(device, settings(), 74, Date.now())).rejects.toThrow("data point 2 is not a number");
  });
});
