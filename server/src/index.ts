import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { z } from "zod";
import { history } from "./history";
import { getStatus, requestReset, startLoop, tick } from "./loop";
import { loadSettings, saveSettings, settingsSchema, toPublic, type PublicSettings } from "./settings";
import type { Status } from "./loop";

export type StatusResponse = { settings: PublicSettings; status: Status };

const port = Number(process.env.PORT ?? 4646);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`PORT must be a positive integer, got "${process.env.PORT}"`);
}

const app = Fastify({ logger: true, disableRequestLogging: true });

app.get("/api/status", async (): Promise<StatusResponse> => ({ settings: toPublic(loadSettings()), status: getStatus() }));

app.put("/api/settings", async (request, reply) => {
  const parsed = settingsSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: z.prettifyError(parsed.error) });
  const saved = saveSettings(parsed.data);
  requestReset();
  void tick(app.log).catch((error: unknown) => app.log.error({ err: error }, "Climate check after save failed"));
  return { settings: toPublic(saved) };
});

const historyQuery = z.object({ hours: z.coerce.number().int().min(1).max(24 * 30).default(24) });

app.get("/api/history", async (request, reply) => {
  const parsed = historyQuery.safeParse(request.query);
  if (!parsed.success) return reply.code(400).send({ error: z.prettifyError(parsed.error) });
  return history(parsed.data.hours, loadSettings().unit);
});

const web = fileURLToPath(new URL("../../web/dist", import.meta.url));
if (existsSync(web)) await app.register(fastifyStatic, { root: web });

startLoop(app.log);
await app.listen({ host: "0.0.0.0", port });
