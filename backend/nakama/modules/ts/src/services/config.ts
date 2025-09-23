import type { nkruntime } from "@heroiclabs/nakama-runtime";

export function getApiBaseUrl(ctx: nkruntime.Context): string {
  const env = ctx.env ?? {};
  return env.API_BASE_URL ?? "http://api-gateway:8080";
}

export function getComplianceToken(ctx: nkruntime.Context): string | undefined {
  return ctx.env?.API_COMPLIANCE_TOKEN;
}

export function getShardTickRate(ctx: nkruntime.Context): number {
  const value = ctx.env?.SHARD_TICK_RATE;
  if (!value) return 5;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}
