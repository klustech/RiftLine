import type { nkruntime } from "@heroiclabs/nakama-runtime";
import { getApiBaseUrl } from "../services/config";

interface CraftPayload {
  itemId: number;
  amount?: number;
  shardId?: number;
  recipeId?: string;
}

export const registerCraftingRpc = (ctx: nkruntime.InitContext) => {
  const moduleName = ctx.env?.MODULE_NAME ?? "riftline";
  const rpcId = `${moduleName}_craft`;

  const handler: nkruntime.RpcFunction = async (rpcCtx, logger, nk, payload) => {
    if (!rpcCtx.userId) throw new Error("missing_user");
    if (!payload) throw new Error("missing_payload");

    const input = JSON.parse(payload) as CraftPayload;
    if (!Number.isFinite(input.itemId)) {
      throw new Error("invalid_item");
    }
    const amount = Number.isFinite(input.amount) ? Math.max(1, Number(input.amount)) : 1;
    const shardId = Number.isFinite(input.shardId) ? Number(input.shardId) : Number(rpcCtx.vars?.shardId ?? 1);

    const body = {
      wallet: rpcCtx.userId,
      itemId: Number(input.itemId),
      amount,
      shardId,
      recipeId: input.recipeId ?? null
    };

    const apiBase = getApiBaseUrl(rpcCtx);
    const response = await nk.httpRequest(
      `${apiBase}/inventory/craft`,
      "POST",
      { "Content-Type": "application/json" },
      JSON.stringify(body)
    );

    if (response.code < 200 || response.code >= 300) {
      logger.error(`craft request failed code=${response.code} body=${response.body}`);
      throw new Error("craft_failed");
    }

    logger.info(`craft success user=${rpcCtx.userId} item=${input.itemId} amount=${amount}`);
    return response.body;
  };

  return { id: rpcId, handler };
};
