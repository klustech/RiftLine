import path from "path";
import fs from "fs";

type DeploymentAddresses = Record<string, string | undefined> & {
  ServerRegistry?: string;
  RiftToken?: string;
  Treasury?: string;
  BusinessLicenseNFT?: string;
  Item1155?: string;
  RentAuction?: string;
  VehicleNFT?: string;
  ApartmentNFT?: string;
  PropertyNFT?: string;
  PropertyVault?: string;
  CharacterSBT?: string;
  AssetMarketplace?: string;
};

export interface AppConfig {
  port: number;
  jwtSecret: string;
  sessionSecret: string;
  corsOrigin: string[];
  databaseUrl: string;
  rpcUrl: string;
  operatorKey: string;
  nakamaRpcUrl?: string;
  deployments: DeploymentAddresses;
}

function readDeployment(): DeploymentAddresses {
  const inline: DeploymentAddresses = {
    ServerRegistry: process.env.SERVER_REGISTRY_ADDRESS,
    RiftToken: process.env.RIFT_TOKEN_ADDRESS,
    Treasury: process.env.TREASURY_ADDRESS,
    BusinessLicenseNFT: process.env.BUSINESS_LICENSE_ADDRESS,
    Item1155: process.env.ITEM1155_ADDRESS,
    RentAuction: process.env.RENT_AUCTION_ADDRESS,
    VehicleNFT: process.env.VEHICLE_NFT_ADDRESS,
    ApartmentNFT: process.env.APARTMENT_NFT_ADDRESS,
    PropertyNFT: process.env.PROPERTY_NFT_ADDRESS,
    PropertyVault: process.env.PROPERTY_VAULT_ADDRESS,
    CharacterSBT: process.env.CHARACTER_SBT_ADDRESS,
    AssetMarketplace: process.env.MARKETPLACE_ADDRESS
  };
  const hasInline = Object.values(inline).some(Boolean);
  if (hasInline) {
    return inline;
  }

  const deploymentFile = process.env.RIFTLINE_DEPLOYMENTS
    ?? path.resolve(process.cwd(), "chain", "deployments", `${process.env.RIFTLINE_NETWORK ?? "local"}.json`);
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Contract deployment file not found at ${deploymentFile}. Provide RIFTLINE_DEPLOYMENTS or explicit addresses.`);
  }
  const json = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  return json as DeploymentAddresses;
}

export function loadConfig(): AppConfig {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
  if (!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET is required");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (!process.env.RPC_URL) throw new Error("RPC_URL is required");
  if (!process.env.OPERATOR_KEY) throw new Error("OPERATOR_KEY is required");

  const cors = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean) : ["*"];

  return {
    port: Number(process.env.PORT ?? 8080),
    jwtSecret: process.env.JWT_SECRET,
    sessionSecret: process.env.SESSION_SECRET,
    corsOrigin: cors,
    databaseUrl: process.env.DATABASE_URL,
    rpcUrl: process.env.RPC_URL,
    operatorKey: process.env.OPERATOR_KEY,
    nakamaRpcUrl: process.env.NAKAMA_RPC_URL,
    deployments: readDeployment()
  };
}
