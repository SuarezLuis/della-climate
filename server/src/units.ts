export type Unit = "F" | "C";

export const convert = (value: number, from: Unit, to: Unit) => {
  if (from === to) return value;
  return to === "F" ? value * 1.8 + 32 : (value - 32) / 1.8;
};

export const convertDelta = (value: number, from: Unit, to: Unit) => {
  if (from === to) return value;
  return to === "F" ? value * 1.8 : value / 1.8;
};
