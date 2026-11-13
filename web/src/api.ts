import type { HistoryPoint } from "@della-climate/server/history";
import type { StatusResponse } from "@della-climate/server/index";
import type { PublicSettings, Settings } from "@della-climate/server/settings";

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, init);
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const hasError = typeof body === "object" && body !== null && "error" in body;
    throw new Error(hasError ? String(body.error) : `The app answered HTTP ${response.status}`);
  }
  return body as T;
};

export const fetchStatus = () => request<StatusResponse>("/api/status");

export const fetchHistory = (hours: number) => request<HistoryPoint[]>(`/api/history?hours=${hours}`);

export const saveSettings = (settings: Settings) =>
  request<{ settings: PublicSettings }>("/api/settings", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(settings),
  });
