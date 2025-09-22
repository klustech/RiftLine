import Constants from "expo-constants";

const API = (Constants.expoConfig?.extra as any)?.apiBase ?? process.env.EXPO_PUBLIC_API ?? "http://localhost:8080";

export async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {} as any)
    }
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}
