import { Router } from "express";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/begin", requireAuth, async (_req, res) => {
  res.json({ provider: "mock-social", url: "https://auth.example/start" });
});

router.post("/complete", requireAuth, async (_req, res) => {
  res.json({ wallet: `0x${'f'.repeat(40)}`, embedded: true });
});

export default router;
