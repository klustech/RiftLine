import type { nkruntime } from "@heroiclabs/nakama-runtime";

const MODULE = "riftline";

const rpcOwnership: nkruntime.RpcFunction = (_ctx, logger, _nk, payload) => {
  logger.debug(`verify ownership payload=${payload}`);
  return JSON.stringify({ ok: true });
};

const rpcSessionStart: nkruntime.RpcFunction = (_ctx, logger, _nk, payload) => {
  logger.info(`session start ${payload}`);
  return JSON.stringify({ ok: true });
};

const rpcProgress: nkruntime.RpcFunction = (_ctx, logger, _nk, payload) => {
  logger.debug(`progress payload=${payload}`);
  return JSON.stringify({ ok: true });
};

const InitModule: nkruntime.InitModule = (ctx) => {
  ctx.registerRpc(`${MODULE}_verifyOwnership`, rpcOwnership);
  ctx.registerRpc(`${MODULE}_sessionStart`, rpcSessionStart);
  ctx.registerRpc(`${MODULE}_grantProgress`, rpcProgress);
};

export { InitModule as Init };
