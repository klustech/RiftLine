import type { nkruntime } from "@heroiclabs/nakama-runtime";
import { getShardTickRate } from "../services/config";
import { loadWanted, storeWanted } from "../services/state";

interface PlayerState {
  presence: nkruntime.Presence;
  heat: number;
  lastUpdate: number;
}

interface MatchState {
  label: string;
  players: Map<string, PlayerState>;
}

export const registerShardMatch = (ctx: nkruntime.InitContext) => {
  const moduleName = ctx.env?.MODULE_NAME ?? "riftline";
  const matchHandler: nkruntime.MatchHandler = {
    matchInit: (_matchCtx, logger, nk, params): nkruntime.MatchInitResult => {
      const label = params?.label ?? `${moduleName}_shard`;
      logger.info(`shard match init label=${label}`);
      const state: MatchState = {
        label,
        players: new Map()
      };
      return {
        state,
        tickRate: getShardTickRate(_matchCtx),
        label
      };
    },
    matchJoinAttempt: async (matchCtx, logger, nk, dispatcher, state, presence) => {
      const wanted = await loadWanted(nk, presence.userId);
      if (wanted && wanted.level >= 4) {
        logger.warn(`deny join user=${presence.userId} reason=critical_wanted`);
        return { state, accept: false, rejectMessage: "wanted_level" };
      }
      return { state, accept: true };
    },
    matchJoin: (_matchCtx, logger, nk, dispatcher, state, presences) => {
      const now = Date.now();
      for (const presence of presences) {
        state.players.set(presence.userId, { presence, heat: 0, lastUpdate: now });
        logger.info(`player joined shard user=${presence.userId}`);
      }
      return { state };
    },
    matchLeave: (_matchCtx, logger, nk, dispatcher, state, presences) => {
      for (const presence of presences) {
        state.players.delete(presence.userId);
        logger.info(`player left shard user=${presence.userId}`);
      }
      return { state };
    },
    matchLoop: async (matchCtx, logger, nk, dispatcher, state, messages) => {
      const now = Date.now();
      for (const message of messages) {
        if (message.opCode === 1) {
          const payload = message.data ? (JSON.parse(message.data) as { deltaHeat?: number }) : {};
          const record = state.players.get(message.sender.userId);
          if (record) {
            record.heat += payload.deltaHeat ?? 0;
            record.lastUpdate = now;
            if (record.heat > 100) {
              const newWanted = {
                level: 2,
                heat: record.heat,
                expiresAt: now + 5 * 60 * 1000
              };
              await storeWanted(nk, message.sender.userId, newWanted);
              await dispatcher.broadcastMessage(2, JSON.stringify({ userId: message.sender.userId, wanted: newWanted }));
            }
          }
        }
      }

      for (const [userId, record] of state.players.entries()) {
        if (now - record.lastUpdate > 30000) {
          dispatcher.broadcastMessage(3, JSON.stringify({ userId, status: "idle" }));
          record.lastUpdate = now;
        }
      }

      return { state };
    },
    matchTerminate: (_matchCtx, logger) => {
      logger.info("shard match terminate");
    },
    matchSignal: (matchCtx, logger, nk, dispatcher, state, data) => {
      const payload = data ? JSON.parse(data) : {};
      logger.debug(`match signal ${JSON.stringify(payload)}`);
      return { state, data: JSON.stringify({ ack: true }) };
    }
  };

  return { id: `${moduleName}_match`, handler: matchHandler };
};
