import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import pino from "pino";
import pinoHttp from "pino-http";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const app = express();
const port = Number(process.env.PORT ?? 3001);
const apiKey = process.env.PAYMASTER_API_KEY ?? process.env.PAYMASTER_KEY;

app.use(pinoHttp({ logger }));
app.use(cors());
app.use(express.json({ limit: "256kb" }));
app.use(rateLimit({ windowMs: 10_000, limit: 30 }));

const allowedScopes = new Set((process.env.ALLOWED_SCOPES ?? "market,auction,character,items").split(","));

app.post("/sponsor", (req, res) => {
  if (apiKey && req.headers["x-api-key"] !== apiKey) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const { scope, wallet } = req.body ?? {};
  if (!scope || typeof scope !== "string" || !allowedScopes.has(scope)) {
    return res.status(400).json({ error: "scope_denied" });
  }
  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "wallet_required" });
  }

  logger.info({ wallet, scope }, "sponsoring user operation");
  res.json({
    approved: true,
    maxGasWei: "30000000000",
    policy: scope
  });
});

app.listen(port, () => {
  logger.info({ port }, "paymaster stub running");
});
