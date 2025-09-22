import { Router } from "express";
import { z } from "zod";
import { createNonce, verifySiwe } from "../auth/siwe";
import { logger } from "../services/logger";

const router = Router();

router.get("/nonce", (_req, res) => {
  res.json({ nonce: createNonce() });
});

router.post("/siwe", async (req, res, next) => {
  try {
    const schema = z.object({ message: z.string(), signature: z.string() });
    const { message, signature } = schema.parse(req.body);
    const result = await verifySiwe(message, signature);
    res.json(result);
  } catch (err) {
    logger.warn({ err }, "siwe verification failed");
    next(err);
  }
});

export default router;
