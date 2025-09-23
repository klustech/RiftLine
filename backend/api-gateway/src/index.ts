import express from "express";
import helmet from "helmet";
import cors from "cors";
import session from "express-session";
import pinoHttp from "pino-http";
import { loadConfig } from "./config/env";
import { rateLimit } from "./middleware/rateLimit";
import { errorHandler } from "./middleware/errors";
import { logger } from "./services/logger";
import authRoutes from "./routes/auth";
import playerRoutes from "./routes/players";
import inventoryRoutes from "./routes/inventory";
import marketRoutes from "./routes/market";
import auctionRoutes from "./routes/auctions";
import shardRoutes from "./routes/shards";
import travelRoutes from "./routes/travel";
import factionRoutes from "./routes/factions";
import telemetryStatsRoutes from "./routes/telemetryStats";
import walletRoutes from "./routes/wallet";
import complianceRoutes from "./routes/compliance";
import telemetryRoutes from "./routes/telemetry";
import sessionKeyRoutes from "./routes/sessionKeys";
import craftingRoutes from "./routes/crafting";
import progressionRoutes from "./routes/progression";
import wantedRoutes from "./routes/wanted";
import streamingRoutes from "./routes/streaming";
import adminRoutes from "./routes/admin";

const config = loadConfig();
const app = express();

app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(rateLimit());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRoutes);
app.use("/players", playerRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/market", marketRoutes);
app.use("/auctions", auctionRoutes);
app.use("/shards", shardRoutes);
app.use("/travel", travelRoutes);
app.use("/factions", factionRoutes);
app.use("/compliance", complianceRoutes);
app.use("/telemetry", telemetryRoutes);
app.use("/telemetry/stats", telemetryStatsRoutes);
app.use("/session-keys", sessionKeyRoutes);
app.use("/wallet", walletRoutes);
app.use("/craft", craftingRoutes);
app.use("/progression", progressionRoutes);
app.use("/wanted", wantedRoutes);
app.use("/streaming", streamingRoutes);
app.use("/admin", adminRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  logger.info({ port: config.port }, "api-gateway listening");
});
