import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pino from "pino";
import pinoHttp from "pino-http";
import Redis from "ioredis";
import { Registry, collectDefaultMetrics, Counter, Gauge } from "prom-client";
import { z } from "zod";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const app = express();
const port = Number(process.env.PORT ?? 3001);
const apiKey = process.env.PAYMASTER_API_KEY ?? process.env.PAYMASTER_KEY;

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const registry = new Registry();
collectDefaultMetrics({ register: registry });
const approvalsCounter = new Counter({ name: "paymaster_approvals_total", help: "Total approvals granted", registers: [registry] });
const deniedCounter = new Counter({ name: "paymaster_denied_total", help: "Denied sponsorships", registers: [registry] });
const allowanceGauge = new Gauge({ name: "paymaster_wallet_allowances", help: "Wallet allowance count", registers: [registry] });

const scopeAllow = new Set((process.env.ALLOWED_SCOPES ?? "market,auction,character,items").split(",").map((s) => s.trim()).filter(Boolean));
const DAILY_LIMIT = Number(process.env.PAYMASTER_DAILY_LIMIT ?? 20);
const REDIS_PREFIX = "paymaster";

const sponsorSchema = z.object({
  wallet: z.string(),
  scope: z.string(),
  reason: z.string().optional()
});

app.use(pinoHttp({ logger }));
app.use(cors());
app.use(express.json({ limit: "256kb" }));
app.use(rateLimit({ windowMs: 10_000, limit: 30 }));

function requireKey(req: express.Request, res: express.Response): boolean {
  if (apiKey && req.headers["x-api-key"] !== apiKey) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

async function allowancesKey(wallet: string, scope: string) {
  return `${REDIS_PREFIX}:allowance:${wallet}:${scope}`;
}

app.get("/health", async (_req, res) => {
  const pong = await redis.ping();
  res.json({ ok: pong === "PONG" });
});

app.get("/metrics", async (_req, res, next) => {
  try {
    res.setHeader("Content-Type", registry.contentType);
    res.end(await registry.metrics());
  } catch (err) {
    next(err);
  }
});

app.get("/allowances/:wallet", async (req, res, next) => {
  try {
    if (!requireKey(req, res)) return;
    const wallet = req.params.wallet;
    const keys = await redis.keys(`${REDIS_PREFIX}:allowance:${wallet}:*`);
    const entries = await Promise.all(keys.map(async (key) => ({
      scope: key.split(":").pop()!,
      remaining: Number(await redis.get(key) ?? "0")
    })));
    allowanceGauge.set(entries.reduce((acc, entry) => acc + entry.remaining, 0));
    res.json({ wallet, allowances: entries });
  } catch (err) {
    next(err);
  }
});

app.post("/sponsor", async (req, res, next) => {
  try {
    if (!requireKey(req, res)) return;
    const { wallet, scope, reason } = sponsorSchema.parse(req.body ?? {});
    if (!scopeAllow.has(scope)) {
      deniedCounter.inc();
      return res.status(400).json({ error: "scope_denied" });
    }
    const key = await allowancesKey(wallet, scope);
    const used = Number(await redis.get(key) ?? "0");
    if (used >= DAILY_LIMIT) {
      deniedCounter.inc();
      return res.status(429).json({ error: "limit_reached" });
    }
    await redis.incr(key);
    await redis.expire(key, 24 * 60 * 60);
    approvalsCounter.inc();
    logger.info({ wallet, scope, reason, used: used + 1 }, "paymaster approval granted");
    res.json({
      approved: true,
      allowanceRemaining: DAILY_LIMIT - (used + 1),
      nonce: used + 1,
      policy: scope,
      maxGasWei: process.env.PAYMASTER_MAX_GAS ?? "30000000000"
    });
  } catch (err) {
    next(err);
  }
});

app.post("/revoke", async (req, res, next) => {
  try {
    if (!requireKey(req, res)) return;
    const { wallet, scope } = sponsorSchema.parse(req.body ?? {});
    const key = await allowancesKey(wallet, scope);
    await redis.del(key);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "paymaster error");
  res.status(500).json({ error: "internal_error" });
});

app.listen(port, () => {
  logger.info({ port }, "paymaster service ready");
});
