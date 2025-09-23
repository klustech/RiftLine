import type { nkruntime } from "@heroiclabs/nakama-runtime";
import { getApiBaseUrl, getComplianceToken } from "../services/config";
import { loadCompliance, loadSession, loadWanted, storeCompliance, storeSession } from "../services/state";
import { updateSessionVars } from "../services/runtime";

interface SessionPayload {
  shardId?: number;
  deviceId?: string;
  attestation?: string;
  wallet?: string;
}

export const registerSessionRpc = (ctx: nkruntime.InitContext) => {
  const moduleName = ctx.env?.MODULE_NAME ?? "riftline";
  const rpcId = `${moduleName}_sessionStart`;

  const handler: nkruntime.RpcFunction = async (rpcCtx, logger, nk, payload) => {
    const input = (payload ? JSON.parse(payload) : {}) as SessionPayload;
    const shardId = Number.isFinite(input.shardId) ? Number(input.shardId) : 1;

    const session: SessionPayload & { shardId: number } = {
      shardId,
      deviceId: input.deviceId,
      attestation: input.attestation,
      wallet: input.wallet ?? rpcCtx.userId
    };

    if (!rpcCtx.userId) {
      throw new Error("missing_user");
    }

    const existingSession = await loadSession(nk, rpcCtx.userId);
    const now = Date.now();
    await storeSession(nk, rpcCtx.userId, {
      shardId: session.shardId,
      deviceId: session.deviceId,
      attestationId: session.attestation,
      lastSeen: now,
      wallet: session.wallet
    });

    if (rpcCtx.sessionId) {
      updateSessionVars(nk, rpcCtx.sessionId, {
        shardId: String(session.shardId),
        deviceId: session.deviceId ?? "",
        wantedLevel: "0"
      });
    }

    const wanted = (await loadWanted(nk, rpcCtx.userId)) ?? { level: 0, heat: 0, expiresAt: 0 };
    let compliance = await loadCompliance(nk, rpcCtx.userId);

    if (!compliance) {
      compliance = { kycStatus: "none", amlStatus: "clear", riskScore: 0 };
    }

    const apiBase = getApiBaseUrl(rpcCtx);
    const complianceToken = getComplianceToken(rpcCtx);
    try {
      const headers: Record<string, string> = complianceToken
        ? { "Content-Type": "application/json", Authorization: `Bearer ${complianceToken}` }
        : { "Content-Type": "application/json" };
      const response = await nk.httpRequest(
        `${apiBase}/compliance/profile`,
        "POST",
        headers,
        JSON.stringify({ wallet: session.wallet })
      );
      if (response.code >= 200 && response.code < 300) {
        const body = JSON.parse(response.body) as {
          kycStatus: string;
          amlStatus: string;
          riskScore: number;
          caseId?: string;
        };
        compliance = {
          kycStatus: body.kycStatus,
          amlStatus: body.amlStatus,
          riskScore: body.riskScore,
          lastCaseId: body.caseId
        };
        await storeCompliance(nk, rpcCtx.userId, compliance);
      } else {
        logger.warn(`compliance profile request failed code=${response.code}`);
      }
    } catch (err) {
      logger.error(`compliance profile lookup failed ${err}`);
    }

    logger.info(
      `session start user=${rpcCtx.userId} shard=${session.shardId} prevShard=${existingSession?.shardId ?? "?"}`
    );

    return JSON.stringify({
      ok: true,
      shardId: session.shardId,
      wanted,
      compliance
    });
  };

  return { id: rpcId, handler };
};
