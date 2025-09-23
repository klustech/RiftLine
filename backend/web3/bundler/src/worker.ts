import Redis from "ioredis";
import pino from "pino";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import path from "path";
import { DEDUPE_PREFIX, HASH_PREFIX, QUEUE_PENDING, QUEUE_PROCESSING } from "./queues";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const upstream = process.env.BUNDLER_UPSTREAM;
const upstreamKey = process.env.BUNDLER_UPSTREAM_KEY ?? process.env.BUNDLER_API_KEY ?? "";
const entryPoint = process.env.ENTRY_POINT ?? "0x";
const maxAttempts = Number(process.env.BUNDLER_SUBMIT_MAX_ATTEMPTS ?? 5);
const retryBase = Number(process.env.BUNDLER_RETRY_BASE_MS ?? 500);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function markFailure(opKey: string, fingerprint: string | undefined, message: string) {
  await redis.hset(opKey, {
    status: "failed",
    completedAt: new Date().toISOString(),
    lastError: message
  });
  if (fingerprint) {
    await redis.del(DEDUPE_PREFIX + fingerprint);
  }
}

async function submitOperation(opId: string) {
  const opKey = HASH_PREFIX + opId;
  const snapshot = await redis.hgetall(opKey);
  if (!Object.keys(snapshot).length) {
    await redis.lrem(QUEUE_PROCESSING, 0, opId);
    return;
  }

  let attempt = Number(snapshot.attempts ?? "0");
  const fingerprint = snapshot.fingerprint;
  let payload: unknown = undefined;
  try {
    payload = snapshot.payload ? JSON.parse(snapshot.payload) : undefined;
  } catch (err) {
    await markFailure(opKey, fingerprint, "payload_parse_error");
    await redis.lrem(QUEUE_PROCESSING, 0, opId);
    return;
  }

  while (attempt < maxAttempts) {
    attempt += 1;
    await redis.hset(opKey, { attempts: String(attempt), status: "submitting", lastError: "" });

    try {
      if (!upstream) {
        log.warn({ opId }, "No upstream configured; marking submitted");
        await redis.hset(opKey, {
          status: "submitted",
          completedAt: new Date().toISOString(),
          hash: "0x0"
        });
        break;
      }

      const response = await fetch(upstream, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(upstreamKey ? { "x-api-key": upstreamKey } : {})
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: opId,
          method: "eth_sendUserOperation",
          params: [payload, entryPoint]
        })
      });

      const body: any = await response.json();
      if (!response.ok || body?.error) {
        const errMsg = body?.error?.message ?? body?.error?.code ?? `upstream_${response.status}`;
        throw new Error(String(errMsg));
      }
      const hash: string | undefined = body?.result ?? body?.hash ?? body?.txHash;
      await redis.hset(opKey, {
        status: "submitted",
        completedAt: new Date().toISOString(),
        hash: typeof hash === "string" ? hash : ""
      });
      break;
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown_error";
      if (attempt >= maxAttempts) {
        await markFailure(opKey, fingerprint, message);
        break;
      }
      await redis.hset(opKey, { status: "retry", lastError: message });
      const delay = retryBase * Math.pow(2, attempt - 1);
      log.warn({ opId, attempt, delay, message }, "user operation submit failed; retrying");
      await sleep(delay);
    }
  }

  await redis.lrem(QUEUE_PROCESSING, 0, opId);
}

export async function runWorker() {
  log.info({ upstream: upstream ?? "dry-run" }, "bundler submit worker started");
  while (true) {
    const opId = await redis.brpoplpush(QUEUE_PENDING, QUEUE_PROCESSING, 0);
    if (!opId) {
      continue;
    }
    try {
      await submitOperation(opId);
    } catch (err) {
      log.error({ err, opId }, "failed to process operation");
      await redis.lrem(QUEUE_PROCESSING, 0, opId);
    }
  }
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  runWorker().catch((err) => {
    log.error({ err }, "submit worker crashed");
    process.exit(1);
  });
}
