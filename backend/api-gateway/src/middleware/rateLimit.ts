import type { Request, Response, NextFunction } from "express";

type BucketEntry = { count: number; resetAt: number };
const WINDOW_MS = 10_000;
const LIMIT = 100;
const buckets = new Map<string, BucketEntry>();

export function rateLimit() {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.headers["x-forwarded-for"]?.toString() || "anon";
    const now = Date.now();
    const entry = buckets.get(key);
    if (!entry || entry.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return next();
    }
    entry.count += 1;
    if (entry.count > LIMIT) {
      const retry = Math.max(0, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader("Retry-After", retry.toString());
      return res.status(429).json({ error: "rate_limited" });
    }
    return next();
  };
}
