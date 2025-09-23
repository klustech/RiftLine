import type { nkruntime } from "@heroiclabs/nakama-runtime";

export const registerFactionRpcs = (ctx: nkruntime.InitContext) => {
  const moduleName = ctx.env?.MODULE_NAME ?? "riftline";
  const joinId = `${moduleName}_factionJoin`;
  const statusId = `${moduleName}_factionStatus`;

  const joinHandler: nkruntime.RpcFunction = (_ctx, logger, nk, payload) => {
    const { faction } = payload ? JSON.parse(payload) : {};
    if (!faction || typeof faction !== "string") {
      throw new Error("invalid_faction");
    }

    nk.storageWrite([
      {
        collection: "faction",
        key: _ctx.userId,
        userId: _ctx.userId,
        value: { faction, ts: Date.now() }
      }
    ]);

    logger.info("faction join %s -> %s", _ctx.userId, faction);
    return JSON.stringify({ ok: true });
  };

  const statusHandler: nkruntime.RpcFunction = (_ctx, _logger, nk) => {
    const result = nk.storageRead([
      { collection: "faction", key: _ctx.userId, userId: _ctx.userId }
    ]);
    const faction = result[0]?.value?.faction ?? null;
    return JSON.stringify({ faction });
  };

  return [
    { id: joinId, handler: joinHandler },
    { id: statusId, handler: statusHandler }
  ];
};
