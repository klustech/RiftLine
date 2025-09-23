import type { nkruntime } from "@heroiclabs/nakama-runtime";
import { clearWanted, loadWanted, storeWanted } from "../services/state";
import { updateSessionVars } from "../services/runtime";
import { getApiBaseUrl } from "../services/config";

interface WantedPayload {
  level?: number;
  minutes?: number;
  heat?: number;
  reason?: string;
}

export const registerWantedRpcs = (ctx: nkruntime.InitContext) => {
  const moduleName = ctx.env?.MODULE_NAME ?? "riftline";

  const applyId = `${moduleName}_wanted`;
  const clearId = `${moduleName}_clearWanted`;
  const statusId = `${moduleName}_wantedStatus`;

  const applyHandler: nkruntime.RpcFunction = async (rpcCtx, logger, nk, payload) => {
    if (!rpcCtx.userId) throw new Error("missing_user");
    const input = (payload ? JSON.parse(payload) : {}) as WantedPayload;
    const level = Math.max(0, Math.min(4, Number.isFinite(input.level) ? Number(input.level) : 1));
    const minutes = Number.isFinite(input.minutes) ? Number(input.minutes) : 5;
    const heat = Number.isFinite(input.heat) ? Number(input.heat) : level * 20;
    const expiresAt = Date.now() + minutes * 60 * 1000;

    const record = { level, heat, expiresAt };
    await storeWanted(nk, rpcCtx.userId, record);
    if (rpcCtx.sessionId) {
      updateSessionVars(nk, rpcCtx.sessionId, {
        wantedLevel: String(level)
      });
    }

    const apiBase = getApiBaseUrl(rpcCtx);
    try {
      await nk.httpRequest(
        `${apiBase}/compliance/audit`,
        "POST",
        { "Content-Type": "application/json" },
        JSON.stringify({
          wallet: rpcCtx.userId,
          kind: "wanted:update",
          level,
          heat,
          expiresAt,
          reason: input.reason ?? "",
          sessionId: rpcCtx.sessionId ?? ""
        })
      );
    } catch (err) {
      logger.warn(`failed to push wanted audit ${err}`);
    }

    logger.info(`wanted applied user=${rpcCtx.userId} level=${level} heat=${heat}`);
    return JSON.stringify({ ok: true, wanted: record });
  };

  const clearHandler: nkruntime.RpcFunction = async (rpcCtx, logger, nk) => {
    if (!rpcCtx.userId) throw new Error("missing_user");
    await clearWanted(nk, rpcCtx.userId);
    if (rpcCtx.sessionId) {
      updateSessionVars(nk, rpcCtx.sessionId, { wantedLevel: "0" });
    }
    logger.info(`wanted cleared user=${rpcCtx.userId}`);
    return JSON.stringify({ ok: true });
  };

  const statusHandler: nkruntime.RpcFunction = async (rpcCtx, logger, nk) => {
    if (!rpcCtx.userId) throw new Error("missing_user");
    const wanted = await loadWanted(nk, rpcCtx.userId);
    logger.debug(`wanted status query user=${rpcCtx.userId}`);
    return JSON.stringify({
      ok: true,
      wanted: wanted ?? { level: 0, heat: 0, expiresAt: 0 }
    });
  };

  return [
    { id: applyId, handler: applyHandler },
    { id: clearId, handler: clearHandler },
    { id: statusId, handler: statusHandler }
  ];
};
