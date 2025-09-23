import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pino from "pino";
import pinoHttp from "pino-http";
import Redis from "ioredis";
import { randomUUID, randomBytes } from "crypto";
import { Registry, collectDefaultMetrics, Counter, Gauge } from "prom-client";
import { z } from "zod";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const app = express();
const port = Number(process.env.PORT ?? 4337);
const apiKey = process.env.BUNDLER_API_KEY ?? process.env.BUNDLER_KEY;

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

const registry = new Registry();
collectDefaultMetrics({ register: registry });
const processedCounter = new Counter({ name: "bundler_processed_total", help: "Total bundled operations", registers: [registry] });
const failedCounter = new Counter({ name: "bundler_failed_total", help: "Total failed operations", registers: [registry] });
const queueGauge = new Gauge({ name: "bundler_queue_depth", help: "Pending queue depth", registers: [registry] });

const QUEUE_PENDING = "bundler:queue:pending";
const QUEUE_PROCESSING = "bundler:queue:processing";
const HASH_PREFIX = "bundler:operation:";
const DEDUPE_PREFIX = "bundler:dedupe:";
const MAX_ATTEMPTS = Number(process.env.BUNDLER_MAX_ATTEMPTS ?? 3);

const userOpSchema = z.object({
  sender: z.string(),
  nonce: z.union([z.string(), z.number()]),
  callData: z.string(),
  maxFeePerGas: z.string().optional(),
  maxPriorityFeePerGas: z.string().optional(),
  signature: z.string().optional()
}).passthrough();

app.use(pinoHttp({ logger }));
app.use(cors());
app.use(express.json({ limit: "512kb" }));
app.use(rateLimit({ windowMs: 10_000, limit: 60 }));

app.get("/health", async (_req, res) => {
  const pong = await redis.ping();
  res.json({ ok: pong === "PONG" });
});

app.get("/metrics", async (_req, res, next) => {
  try {
    const depth = await redis.llen(QUEUE_PENDING);
    queueGauge.set(depth);
    res.setHeader("Content-Type", registry.contentType);
    res.end(await registry.metrics());
  } catch (err) {
    next(err);
  }
});

app.get("/operations/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = await redis.hgetall(HASH_PREFIX + id);
    if (!Object.keys(data).length) {
      return res.status(404).json({ error: "not_found" });
    }
    if (data.payload) {
      data.payload = JSON.parse(data.payload);
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

app.post("/rpc", async (req, res, next) => {
  try {
    if (apiKey && req.headers["x-api-key"] !== apiKey) {
      return res.status(401).json({ error: "unauthorized" });
    }
    const payload = userOpSchema.parse(req.body ?? {});
    const fingerprint = `${payload.sender}:${String(payload.nonce)}`;
    const opId = randomUUID();
    const dedupeKey = DEDUPE_PREFIX + fingerprint;

    const dedupeResult = await redis.set(dedupeKey, opId, "EX", 900, "NX");
    if (!dedupeResult) {
      const existingId = await redis.get(dedupeKey);
      return res.status(409).json({ error: "duplicate", operationId: existingId });
    }

    const opKey = HASH_PREFIX + opId;
    await redis.hset(opKey, {
      id: opId,
      fingerprint,
      status: "queued",
      attempts: "0",
      createdAt: new Date().toISOString(),
      sender: payload.sender,
      nonce: String(payload.nonce),
      payload: JSON.stringify(payload)
    });
    await redis.rpush(QUEUE_PENDING, opId);
    queueGauge.inc();

    res.json({ operationId: opId, status: "queued" });
  } catch (err) {
    next(err);
  }
});

async function processOperation(opId: string) {
  const opKey = HASH_PREFIX + opId;
  const data = await redis.hgetall(opKey);
  if (!Object.keys(data).length) {
    await redis.lrem(QUEUE_PROCESSING, 0, opId);
    return;
  }
  const attempts = Number(data.attempts ?? "0") + 1;
  await redis.hset(opKey, { attempts: String(attempts), status: "processing", lastError: "" });

  try {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (Math.random() < 0.05) {
      throw new Error("simulation_failure");
    }
    const txHash = `0x${randomBytes(32).toString("hex")}`;
    await redis.hset(opKey, {
      status: "submitted",
      completedAt: new Date().toISOString(),
      hash: txHash
    });
    processedCounter.inc();
    await redis.lrem(QUEUE_PROCESSING, 0, opId);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "unknown_error";
    if (attempts >= MAX_ATTEMPTS) {
      await redis.hset(opKey, {
        status: "failed",
        completedAt: new Date().toISOString(),
        lastError: errorMessage
      });
      failedCounter.inc();
      await redis.lrem(QUEUE_PROCESSING, 0, opId);
      const fingerprint = data.fingerprint;
      if (fingerprint) {
        await redis.del(DEDUPE_PREFIX + fingerprint);
      }
    } else {
      await redis.hset(opKey, {
        status: "retry",
        lastError: errorMessage
      });
      await redis.lrem(QUEUE_PROCESSING, 0, opId);
      await redis.rpush(QUEUE_PENDING, opId);
    }
  }
}

async function workerLoop() {
  while (true) {
    const opId = await redis.brpoplpush(QUEUE_PENDING, QUEUE_PROCESSING, 0);
    if (!opId) {
      continue;
    }
    queueGauge.dec();
    await processOperation(opId);
  }
}

workerLoop().catch((err) => {
  logger.error({ err }, "worker loop crashed");
  process.exit(1);
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "bundler error");
  res.status(500).json({ error: "internal_error" });
});

app.listen(port, () => {
  logger.info({ port }, "bundler service ready");
});
