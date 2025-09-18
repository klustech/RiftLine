import { ethers } from "hardhat";
import { load, save } from "./utils";

const SERVERS = [
  { id: 1, name: "Shore City" },
  { id: 2, name: "Highlands" }
];

const BUSINESSES = [
  { ns: "BUS", name: "FUEL", cap: 6, reserve: 20000, floor: 5000, minInc: 1000, leaseDays: 7 },
  { ns: "BUS", name: "AUTOSHOP", cap: 5, reserve: 25000, floor: 6000, minInc: 1000, leaseDays: 7 },
  { ns: "BUS", name: "TAXI", cap: 5, reserve: 22000, floor: 6000, minInc: 1000, leaseDays: 7 },
  { ns: "BUS", name: "COURIER", cap: 5, reserve: 20000, floor: 5000, minInc: 1000, leaseDays: 7 },
  { ns: "BUS", name: "CLUB", cap: 3, reserve: 40000, floor: 12000, minInc: 2000, leaseDays: 7 },
  { ns: "BUS", name: "AMMUNATION", cap: 3, reserve: 50000, floor: 15000, minInc: 2500, leaseDays: 7 },
  { ns: "BUS", name: "ARCADE", cap: 4, reserve: 15000, floor: 4000, minInc: 1000, leaseDays: 7 },
  { ns: "BUS", name: "MEDIA", cap: 3, reserve: 25000, floor: 8000, minInc: 1500, leaseDays: 7 },
  { ns: "BUS", name: "CARGO", cap: 2, reserve: 30000, floor: 10000, minInc: 2000, leaseDays: 7 },
  { ns: "BUS", name: "MED", cap: 3, reserve: 22000, floor: 7000, minInc: 1000, leaseDays: 7 }
];

const WEAPON_CAPS: Record<number, number> = {
  1001: 500, 1002: 500, 1003: 400,
  1004: 300, 1005: 250, 1006: 150, 1007: 180, 1008: 220,
  1009: 180, 1010: 140, 1011: 100,
  1012: 140, 1013: 110, 1014: 80,
  1015: 160, 1016: 160, 1017: 140, 1018: 100,
  1019: 90, 1020: 80, 1021: 60,
  1022: 70, 1023: 50, 1024: 40, 1025: 60,
  1026: 220, 1027: 90, 1028: 200, 1029: 120, 1030: 140
};

async function main() {
  const state = load();
  const registry = await ethers.getContractAt("ServerRegistry", state.ServerRegistry);

  for (const s of SERVERS) {
    const existing = await registry.servers(s.id);
    if (!existing.name) {
      const tx = await registry.registerServer(s.id, s.name);
      await tx.wait();
      console.log(`Registered server ${s.id}: ${s.name}`);
    }
  }

  for (const s of SERVERS) {
    for (const b of BUSINESSES) {
      const kind = await registry.kindKey(b.ns, b.name);
      const tx = await registry.setCap(s.id, kind, b.cap);
      await tx.wait();
      console.log(`Cap set: server ${s.id} ${b.ns}:${b.name} -> ${b.cap}`);
    }
  }

  for (const s of SERVERS) {
    for (const [tidStr, cap] of Object.entries(WEAPON_CAPS)) {
      const tid = Number(tidStr);
      const kind = await registry.kindKey("WEAPON", `T${tid}`);
      const tx = await registry.setCap(s.id, kind, cap);
      await tx.wait();
      console.log(`Cap set: server ${s.id} WEAPON:T${tid} -> ${cap}`);
    }
  }

  state.__SERVERS = SERVERS;
  state.__BUSINESSES = BUSINESSES;
  state.__WEAPON_CAPS = WEAPON_CAPS;
  save(state);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
