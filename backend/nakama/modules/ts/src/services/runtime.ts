import type { nkruntime } from "@heroiclabs/nakama-runtime";

type SessionRuntime = nkruntime.Nakama & {
  sessionUpdate(sessionId: string, vars: Record<string, string>): void;
};

export function updateSessionVars(
  nk: nkruntime.Nakama,
  sessionId: string,
  vars: Record<string, string>
): void {
  const runtime = nk as SessionRuntime;
  runtime.sessionUpdate(sessionId, vars);
}
