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

app.use(errorHandler);

app.listen(config.port, () => {
  logger.info({ port: config.port }, "api-gateway listening");
});
