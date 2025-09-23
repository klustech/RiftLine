import express from "express";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

let playersRoute: express.Router;
let shardsRoute: express.Router;
let errorHandler: express.ErrorRequestHandler;
let prisma: typeof import("../src/services/db").prisma;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test_jwt_secret";
  process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "test_session_secret";
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/db";
  process.env.RPC_URL = process.env.RPC_URL ?? "http://localhost:8545";
  process.env.OPERATOR_KEY = process.env.OPERATOR_KEY ?? "0xoperator";
  process.env.SERVER_REGISTRY_ADDRESS = process.env.SERVER_REGISTRY_ADDRESS ?? "0x0000000000000000000000000000000000000000";

  ({ prisma } = await import("../src/services/db"));
  ({ default: playersRoute } = await import("../src/routes/players"));
  ({ default: shardsRoute } = await import("../src/routes/shards"));
  ({ errorHandler } = await import("../src/middleware/errors"));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("core API routes", () => {
  it("issues a guest token and lists shards", async () => {
    const mockPlayer = {
      id: "player1",
      wallet: "guest:mock",
      username: "rft_mock",
      createdAt: new Date(),
      updatedAt: new Date(),
      kycStatus: "guest",
      shardId: null,
      wantedUntil: null,
      characterSbt: null,
      softBalance: BigInt(0),
      pushToken: null,
      riskScore: 0,
      restrictedAt: null
    } as const;

    vi.spyOn(prisma.player, "create").mockResolvedValue(mockPlayer as any);
    vi.spyOn(prisma.shard, "findMany").mockResolvedValue([
      { id: 1, name: "Alpha", ruleset: {}, active: true, population: 0 }
    ] as any);

    const app = express();
    app.use(express.json());
    app.use("/players", playersRoute);
    app.use("/shards", shardsRoute);
    app.use(errorHandler);

    const guest = await request(app).post("/players/guest").send({ username: "tester" });
    expect(guest.status).toBe(200);
    expect(typeof guest.body.token).toBe("string");
    expect(guest.body.player.username).toBe("rft_mock");

    const shardResp = await request(app).get("/shards");
    expect(shardResp.status).toBe(200);
    expect(Array.isArray(shardResp.body)).toBe(true);
    expect(shardResp.body[0]?.name).toBe("Alpha");
  });
});
