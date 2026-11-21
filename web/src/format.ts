import type { Unit } from "@della-climate/server/units";

export const formatTemp = (value: number | null, unit: Unit) => (value === null ? "–" : `${value.toFixed(1)}°${unit}`);

export const timeAgo = (timestamp: number | null) => {
  if (timestamp === null) return "Never";
  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
};

export const pick = <T extends string>(options: readonly T[], value: string | null) => options.find((option) => option === value);
