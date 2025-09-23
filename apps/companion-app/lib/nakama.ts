import { Client, type DefaultSocket } from "@heroiclabs/nakama-js";

const host = process.env.EXPO_PUBLIC_NAKAMA_HOST ?? "127.0.0.1";
const port = process.env.EXPO_PUBLIC_NAKAMA_PORT ?? "7350";
const useSSL = process.env.EXPO_PUBLIC_NAKAMA_SSL === "true";

const client = new Client("defaultkey", host, port, useSSL);

export async function connectAnon(username: string) {
  const session = await client.authenticateDevice(username, true, username);
  const socket = client.createSocket(useSSL, false) as DefaultSocket;
  await socket.connect(session, true);
  return { session, socket };
}

export async function joinGlobal(socket: DefaultSocket, roomName = "global") {
  const ROOM_TYPE = 1; // ChannelType.Room
  return socket.joinChat(roomName, ROOM_TYPE, true, true);
}
