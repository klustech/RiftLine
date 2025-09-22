import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import pino from "pino";
import pinoHttp from "pino-http";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const app = express();
const port = Number(process.env.PORT ?? 4337);
const apiKey = process.env.BUNDLER_API_KEY ?? process.env.BUNDLER_KEY;

app.use(pinoHttp({ logger }));
app.use(cors());
app.use(express.json({ limit: "512kb" }));
app.use(rateLimit({ windowMs: 10_000, limit: 50 }));

app.post("/rpc", (req, res) => {
  if (apiKey && req.headers["x-api-key"] !== apiKey) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const userOp = req.body;
  logger.info({ userOp }, "received user operation");
  return res.json({
    status: "accepted",
    received: userOp,
    fakeHash: "0x" + Buffer.from("riftline-bundler").toString("hex").padEnd(64, "0")
  });
});

app.listen(port, () => {
  logger.info({ port }, "bundler stub running");
});
