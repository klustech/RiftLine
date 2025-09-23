import type { nkruntime } from "@heroiclabs/nakama-runtime";
import { registerSessionRpc } from "./rpc/session";
import { registerWantedRpcs } from "./rpc/wanted";
import { registerFactionRpcs } from "./rpc/factions";
import { registerCraftingRpc } from "./economy/crafting";
import { registerShardMatch } from "./match/shard";
import { registerTransferRpc } from "./rpc/transfer";

const Init: nkruntime.InitModule = (ctx) => {
  const session = registerSessionRpc(ctx);
  ctx.registerRpc(session.id, session.handler);

  const wantedRpcs = registerWantedRpcs(ctx);
  for (const rpc of wantedRpcs) {
    ctx.registerRpc(rpc.id, rpc.handler);
  }

  const factionRpcs = registerFactionRpcs(ctx);
  for (const rpc of factionRpcs) {
    ctx.registerRpc(rpc.id, rpc.handler);
  }

  const craftRpc = registerCraftingRpc(ctx);
  ctx.registerRpc(craftRpc.id, craftRpc.handler);

  const shardMatch = registerShardMatch(ctx);
  ctx.registerMatch(shardMatch.id, shardMatch.handler);

  const transferRpc = registerTransferRpc(ctx);
  ctx.registerRpc(transferRpc.id, transferRpc.handler);
};

export { Init };
