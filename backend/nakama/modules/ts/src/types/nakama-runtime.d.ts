declare namespace nkruntime {
  interface Context {
    userId?: string;
    sessionId?: string;
    userSessionExp?: number;
    env?: Record<string, string>;
    vars?: Record<string, string>;
  }

  interface Logger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
  }

  interface StorageObjectWrite {
    collection: string;
    key: string;
    value: string | Record<string, unknown>;
    permissionRead?: number;
    permissionWrite?: number;
    userId?: string;
  }

  interface StorageObjectRead {
    collection: string;
    key: string;
    userId?: string;
  }

  interface StorageObject {
    collection: string;
    key: string;
    value: Record<string, unknown>;
    userId: string;
  }

  interface Nakama {
    storageWrite(objects: StorageObjectWrite[]): Promise<void> | void;
    storageRead(objects: StorageObjectRead[]): Promise<StorageObject[]>;
    storageDelete(objects: StorageObjectRead[]): Promise<void> | void;
    httpRequest(url: string, method: string, headers?: Record<string, string>, body?: string): Promise<{
      code: number;
      headers: Record<string, string>;
      body: string;
    }>;
    sessionUpdate(sessionId: string, vars: Record<string, string>): void;
    binaryToString?(value: unknown): string;
    rpc(id: string, payload?: string, userId?: string, username?: string): string | Promise<string>;
  }

  type RpcFunction = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    payload: string
  ) => string | void | Promise<string | void>;

  interface Presence {
    userId: string;
  }

  interface MatchDispatcher {
    broadcastMessage(opCode: number, data: string): void;
  }

  interface MatchInitResult {
    state: unknown;
    tickRate: number;
    label?: string;
  }

  interface MatchHandler {
    matchInit?: (
      ctx: Context,
      logger: Logger,
      nk: Nakama,
      params: Record<string, string>
    ) => MatchInitResult;
    matchJoinAttempt?: (
      ctx: Context,
      logger: Logger,
      nk: Nakama,
      dispatcher: MatchDispatcher,
      state: any,
      presence: Presence
    ) => Promise<{ state: any; accept: boolean; rejectMessage?: string }>;
    matchJoin?: (
      ctx: Context,
      logger: Logger,
      nk: Nakama,
      dispatcher: MatchDispatcher,
      state: any,
      presences: Presence[]
    ) => { state: any };
    matchLeave?: (
      ctx: Context,
      logger: Logger,
      nk: Nakama,
      dispatcher: MatchDispatcher,
      state: any,
      presences: Presence[]
    ) => { state: any };
    matchLoop?: (
      ctx: Context,
      logger: Logger,
      nk: Nakama,
      dispatcher: MatchDispatcher,
      state: any,
      messages: Array<{ opCode: number; data?: string; sender: Presence }>
    ) => Promise<{ state: any }>;
    matchTerminate?: (ctx: Context, logger: Logger) => void;
    matchSignal?: (
      ctx: Context,
      logger: Logger,
      nk: Nakama,
      dispatcher: MatchDispatcher,
      state: any,
      data: string
    ) => { state: any; data?: string };
  }

  interface InitContext {
    registerRpc(id: string, fn: RpcFunction): void;
    registerMatch(id: string, handler: MatchHandler): void;
    env?: Record<string, string>;
  }

  type InitModule = (ctx: InitContext) => void;
}

declare module "@heroiclabs/nakama-runtime" {
  export { nkruntime };
}
