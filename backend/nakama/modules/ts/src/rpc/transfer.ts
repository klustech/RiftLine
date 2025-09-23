import type { nkruntime } from "@heroiclabs/nakama-runtime";

interface TransferPayload {
  wallet?: string;
  to?: string;
  shardId?: number;
}

export const registerTransferRpc = (ctx: nkruntime.InitContext) => {
  const moduleName = ctx.env?.MODULE_NAME ?? "riftline";
  const rpcId = `${moduleName}_transfer`;

  const handler: nkruntime.RpcFunction = async (rpcCtx, logger, nk, payload) => {
    const data = (payload ? JSON.parse(payload) : {}) as TransferPayload;
    const sourceWallet = data.wallet ?? rpcCtx.userId;
    const targetShard = Number.isFinite(data.shardId) ? Number(data.shardId) : undefined;

    if (!rpcCtx.userId) {
      throw new Error("missing_user");
    }
    if (!sourceWallet) {
      throw new Error("missing_wallet");
    }
    if (!data.to) {
      throw new Error("missing_destination");
    }

    const storageKey = `transfer:${sourceWallet}`;
    nk.storageWrite([
      {
        collection: "xshard",
        key: storageKey,
        userId: rpcCtx.userId,
        value: {
          to: data.to,
          shardId: targetShard,
          at: Date.now()
        }
      }
    ]);

    nk.storageDelete([{
      collection: "enforcement",
      key: `wanted:${rpcCtx.userId}`,
      userId: rpcCtx.userId
    }]);
    logger.info("transfer committed for %s -> %s", sourceWallet, data.to);
    return JSON.stringify({ ok: true });
  };

  return { id: rpcId, handler };
};
