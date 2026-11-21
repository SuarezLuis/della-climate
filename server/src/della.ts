import TuyAPI from "tuyapi";
import { z } from "zod";
import type { Settings } from "./settings";

type DeviceConfig = Settings["device"];
export type DataPoints = Record<string, unknown>;

export type Device = {
  read: () => Promise<DataPoints>;
  write: (dataPoint: string, value: number) => Promise<void>;
};

const TIMEOUT_MS = 15_000;
const status = z.object({ dps: z.record(z.string(), z.unknown()) });

// One short connection per use: Tuya units accept few local connections, and a held one goes stale
export const withDevice = <T>(config: DeviceConfig, work: (device: Device) => Promise<T>) =>
  new Promise<T>((resolve, reject) => {
    const tuya = new TuyAPI({ id: config.id, key: config.key, ip: config.ip, version: config.version, issueGetOnConnect: false });
    const timer = setTimeout(() => fail(new Error(`did not answer within ${TIMEOUT_MS / 1000} seconds`)), TIMEOUT_MS);
    const done = () => {
      clearTimeout(timer);
      tuya.disconnect();
    };
    const fail = (error: unknown) => {
      done();
      reject(error);
    };
    tuya.on("error", fail);

    const device: Device = {
      read: async () => {
        const parsed = status.safeParse(await tuya.get({ schema: true }));
        if (!parsed.success) throw new Error("sent a status with no data points; check the device ID, key and protocol version");
        return parsed.data.dps;
      },
      write: async (dataPoint, value) => {
        await tuya.set({ dps: Number(dataPoint), set: value });
      },
    };

    tuya
      .connect()
      .then(() => work(device))
      .then((value) => {
        done();
        resolve(value);
      }, fail);
  });
