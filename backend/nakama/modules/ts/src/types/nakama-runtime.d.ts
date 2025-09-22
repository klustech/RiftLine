declare namespace nkruntime {
  interface Context {
    userId?: string;
    sessionId?: string;
    userSessionExp?: number;
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

  interface Nakama {
    storageWrite(objects: StorageObjectWrite[]): void;
    rpc(id: string, payload?: string, userId?: string, username?: string): string | Promise<string>;
  }

  type RpcFunction = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    payload: string
  ) => string | void | Promise<string | void>;

  interface InitContext {
    registerRpc(id: string, fn: RpcFunction): void;
  }

  type InitModule = (ctx: InitContext) => void;
}

declare module "@heroiclabs/nakama-runtime" {
  export { nkruntime };
}
