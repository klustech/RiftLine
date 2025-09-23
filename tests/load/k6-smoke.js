import http from "k6/http";
import { sleep, check } from "k6";

export const options = {
  vus: 5,
  duration: "30s"
};

export default function () {
  const baseUrl = __ENV.API_BASE ?? "http://localhost:8080";

  const guestResponse = http.post(`${baseUrl}/players/guest`, JSON.stringify({ username: `smoke_${Date.now()}` }), {
    headers: { "Content-Type": "application/json" }
  });

  check(guestResponse, {
    "guest token issued": (res) => res.status === 200 && typeof res.json("token") === "string"
  });

  const token = guestResponse.json("token");
  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  };

  const shardResponse = http.get(`${baseUrl}/shards`);
  check(shardResponse, {
    "shards listed": (res) => res.status === 200
  });

  const inventoryResponse = http.get(`${baseUrl}/inventory`, authHeaders);
  check(inventoryResponse, {
    "inventory accessible": (res) => res.status === 200 || res.status === 404 || res.status === 401
  });

  http.post(
    `${baseUrl}/telemetry`,
    JSON.stringify({ kind: "k6_smoke", payload: { timestamp: Date.now() } }),
    authHeaders
  );

  const wantedResponse = http.post(`${baseUrl}/wanted/add`, JSON.stringify({ stars: 1 }), authHeaders);
  check(wantedResponse, {
    "wanted add ok": (res) => res.status === 200
  });

  sleep(1);
}
