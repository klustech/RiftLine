import { useEffect, useState } from "react";

export type Player = {
  id: string;
  username: string;
  wallet: string;
  shardId?: number | null;
};

type Listener<T> = (value: T) => void;

let player: Player | null = null;
const playerListeners = new Set<Listener<Player | null>>();

export function setPlayer(next: Player | null) {
  player = next;
  playerListeners.forEach((listener) => listener(next));
}

export function usePlayer() {
  const [state, setState] = useState(player);
  useEffect(() => {
    playerListeners.add(setState);
    return () => playerListeners.delete(setState);
  }, []);
  return state;
}
