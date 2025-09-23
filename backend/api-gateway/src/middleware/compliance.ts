import type { Request, Response, NextFunction } from "express";
import { ensurePlayerCompliance } from "../services/compliance";

export async function requireCompliantPlayer(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    return res.status(401).json({ error: "missing_auth" });
  }
  try {
    const gate = await ensurePlayerCompliance(req.auth.id);
    if (!gate.ok) {
      return res.status(403).json({ error: "compliance_block", reason: gate.reason });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}
