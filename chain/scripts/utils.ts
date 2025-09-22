import { ethers, upgrades, network } from "hardhat";
import fs from "fs";
import path from "path";

export const chainFile = () => path.join(__dirname, `../deployments/${network.name}.json`);

export const load = () => {
  const f = chainFile();
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
};

export const save = (obj: any) => {
  const f = chainFile();
  const dir = path.dirname(f);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(f, JSON.stringify(obj, null, 2));
  console.log(`Saved deployments -> ${f}`);
};

export const addr = (name: string, obj: any) => {
  if (!obj[name]) throw new Error(`Missing address for ${name}`);
  return obj[name];
};

export const now = () => Math.floor(Date.now() / 1000);

export const oneDay = 24 * 60 * 60;

export const roles = {
  REGISTRY: {
    ADMIN_ROLE: ethers.id("ADMIN_ROLE"),
    SERVER_MANAGER_ROLE: ethers.id("SERVER_MANAGER_ROLE"),
    MINTER_ROLE: ethers.id("MINTER_ROLE"),
  },
  LICENSE: {
    ADMIN_ROLE: ethers.id("ADMIN_ROLE"),
    MINTER_ROLE: ethers.id("MINTER_ROLE"),
  },
  ITEM: {
    ADMIN_ROLE: ethers.id("ADMIN_ROLE"),
    MINTER_ROLE: ethers.id("MINTER_ROLE"),
  },
  PROPERTY: {
    ADMIN_ROLE: ethers.id("ADMIN_ROLE"),
    MINTER_ROLE: ethers.id("MINTER_ROLE"),
    MANAGER_ROLE: ethers.id("MANAGER_ROLE"),
  },
  VEHICLE: {
    ADMIN_ROLE: ethers.id("ADMIN_ROLE"),
    CUSTODIAN_ROLE: ethers.id("CUSTODIAN_ROLE"),
    OPERATOR_ROLE: ethers.id("OPERATOR_ROLE"),
  },
  RFT: {
    ADMIN_ROLE: ethers.id("ADMIN_ROLE"),
    MINTER_ROLE: ethers.id("MINTER_ROLE"),
  },
  TREASURY: {
    ADMIN_ROLE: ethers.id("ADMIN_ROLE"),
    EMITTER_ROLE: ethers.id("EMITTER_ROLE"),
  },
  MARKET: {
    ADMIN_ROLE: ethers.id("ADMIN_ROLE"),
    LISTING_MANAGER_ROLE: ethers.id("LISTING_MANAGER_ROLE"),
  },
  AUCTION: {
    ADMIN_ROLE: ethers.id("ADMIN_ROLE"),
  }
};
