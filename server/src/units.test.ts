import { describe, expect, it } from "vitest";
import { switchUnit } from "./units";

describe("switchUnit", () => {
  it("converts target and deadband, and round-trips without drift", () => {
    const f = { unit: "F" as const, target: 74, deadband: 0.5 };
    const c = switchUnit(f, "C");
    expect(c).toEqual({ unit: "C", target: 23.5, deadband: 0.3 });
    expect(switchUnit(c, "F")).toEqual(f);
  });

  it("leaves settings alone when the unit is unchanged", () => {
    expect(switchUnit({ unit: "C" as const, target: 22.5, deadband: 0.5 }, "C")).toEqual({ unit: "C", target: 22.5, deadband: 0.5 });
  });
});
