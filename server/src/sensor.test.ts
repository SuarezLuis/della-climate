import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { readSensor } from "./sensor";

let server: Server | undefined;

const serve = async (status: number, body: string) => {
  server = createServer((_request, response) => response.writeHead(status, { "content-type": "application/json" }).end(body));
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server?.address() as AddressInfo).port}/sensor/room_temperature`;
};

afterEach(() => server?.close());

describe("readSensor", () => {
  it("reads the value from an ESPHome sensor", async () => {
    const url = await serve(200, '{"id":"sensor-room_temperature","value":22.5,"state":"22.5 °C"}');
    expect(await readSensor(url)).toBe(22.5);
  });

  it("rejects a sensor with no reading", async () => {
    const url = await serve(200, '{"id":"sensor-room_temperature","state":"NA"}');
    await expect(readSensor(url)).rejects.toThrow("no numeric value");
  });

  it("rejects an HTTP error", async () => {
    const url = await serve(404, "{}");
    await expect(readSensor(url)).rejects.toThrow("HTTP 404");
  });
});
