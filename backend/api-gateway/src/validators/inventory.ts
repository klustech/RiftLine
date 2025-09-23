import { z } from "zod";

export const craftRequestSchema = z.object({
  itemId: z.number().int().min(1),
  amount: z.number().int().min(1).max(50).default(1),
  shardId: z.number().int().min(0).default(0),
  recipeId: z.string().optional()
});

export const deviceAttestationSchema = z.object({
  deviceId: z.string().min(8),
  attestationId: z.string().min(8),
  platform: z.string().min(2),
  result: z.enum(["trusted", "unverified", "blocked"])
});

export const amlScanSchema = z.object({
  provider: z.string().default("mock"),
  score: z.number().min(0).max(100).optional()
});

export const kycStartSchema = z.object({
  provider: z.string().default("mock"),
  level: z.string().default("standard")
});

export const complianceProfileSchema = z.object({
  wallet: z.string()
});

export const kycCallbackSchema = z.object({
  caseId: z.string(),
  status: z.enum(["pending", "collecting", "approved", "rejected", "manual_review"]),
  reference: z.string().optional()
});
