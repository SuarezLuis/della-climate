import { z } from "zod";

// ESPHome's web_server answers GET /sensor/<id> with {"id": ..., "value": 22.5, "state": "22.5 °C"}
const esphomeState = z.object({ value: z.number() });

export const readSensor = async (url: string): Promise<number> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error(`answered HTTP ${response.status}`);
  const parsed = esphomeState.safeParse(await response.json());
  if (!parsed.success) throw new Error("returned no numeric value; is the URL an ESPHome /sensor/<id> address?");
  return parsed.data.value;
};
