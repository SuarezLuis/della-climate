declare module "tuyapi" {
  import { EventEmitter } from "node:events";

  type Options = { id: string; key: string; ip: string; version: string; issueGetOnConnect?: boolean };

  export default class TuyAPI extends EventEmitter {
    constructor(options: Options);
    connect(): Promise<boolean>;
    disconnect(): void;
    get(options: { schema: true }): Promise<unknown>;
    set(options: { dps: number; set: boolean | number | string }): Promise<unknown>;
  }
}
