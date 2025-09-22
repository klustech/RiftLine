import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { loadConfig } from "../config/env";

export interface AuthContext {
  id: string;
  wallet: string;
  exp?: number;
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthContext;
  }
}

const { jwtSecret } = loadConfig();

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthContext & { sub?: string; w?: string };
    req.auth = {
      id: decoded.id ?? decoded.sub ?? "",
      wallet: decoded.wallet ?? decoded.w ?? ""
    };
    if (!req.auth.id || !req.auth.wallet) {
      throw new Error("token missing claims");
    }
    return next();
  } catch (err) {
    return res.status(401).json({ error: "invalid_token" });
  }
}
