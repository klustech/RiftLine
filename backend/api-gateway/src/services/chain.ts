import { ethers } from "ethers";
import { loadConfig } from "../config/env";
import { logger } from "./logger";

const config = loadConfig();

const rentAuctionAbi = [
  "function totalLots() view returns (uint256)",
  "function lots(uint256) view returns (uint256 tokenId,uint64 startTime,uint64 endTime,uint64 leaseSeconds,uint96 reserve,uint96 minIncrement,address highBidder,uint96 highBid)",
  "function bid(uint256 lotId, uint96 amount)"
];

const businessLicenseAbi = [
  "function userOf(uint256 tokenId) view returns (address)",
  "function userExpires(uint256 tokenId) view returns (uint256)",
  "function serverOf(uint256 tokenId) view returns (uint32)",
  "function kindOf(uint256 tokenId) view returns (bytes32)"
];

const propertyAbi = [
  "function userOf(uint256 tokenId) view returns (address)",
  "function userExpires(uint256 tokenId) view returns (uint256)",
  "function serverOf(uint256 tokenId) view returns (uint32)",
  "function kindOf(uint256 tokenId) view returns (bytes32)"
];

const item1155Abi = [
  "function balanceOf(address owner, uint256 id) view returns (uint256)"
];

const vehicleAbi = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getVehicle(uint256 tokenId) view returns (tuple(uint16 maxKph,uint16 accelMs,uint16 handling,uint16 fuel,uint8 seats,uint8 vclass,uint8 armor,uint16 flags,uint256 price))"
];

const apartmentAbi = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function apartments(uint256 tokenId) view returns (tuple(uint8 tier,uint8 garage,uint16 storageSlots,uint32 perks,uint256 price))"
];

const marketplaceAbi = [
  "function list721(address nft,uint256 tokenId,address payToken,uint256 price)",
  "function list1155(address nft,uint256 id,uint256 amount,address payToken,uint256 price)",
  "function buy721(address nft,uint256 tokenId,uint256 amount) payable",
  "function buy1155(address nft,uint256 id,address seller,uint256 amount,uint256 totalPrice) payable",
  "function feeBps() view returns (uint16)"
];

export const provider = new ethers.JsonRpcProvider(config.rpcUrl);
export const operator = new ethers.Wallet(config.operatorKey, provider);

function requireAddress(name: keyof typeof config.deployments) {
  const addr = config.deployments[name];
  if (!addr) throw new Error(`Missing ${name} address in deployment config`);
  return addr;
}

export const contracts = {
  rentAuction: new ethers.Contract(requireAddress("RentAuction"), rentAuctionAbi, operator),
  businessLicense: new ethers.Contract(requireAddress("BusinessLicenseNFT"), businessLicenseAbi, provider),
  property: config.deployments.PropertyNFT ? new ethers.Contract(requireAddress("PropertyNFT"), propertyAbi, provider) : undefined,
  item1155: new ethers.Contract(requireAddress("Item1155"), item1155Abi, provider),
  vehicle: config.deployments.VehicleNFT ? new ethers.Contract(requireAddress("VehicleNFT"), vehicleAbi, provider) : undefined,
  apartment: config.deployments.ApartmentNFT ? new ethers.Contract(requireAddress("ApartmentNFT"), apartmentAbi, provider) : undefined,
  marketplace: config.deployments.AssetMarketplace ? new ethers.Contract(requireAddress("AssetMarketplace"), marketplaceAbi, operator) : undefined
};

export async function verifyBusinessLease(tokenId: number) {
  const [user, expires, serverId, kind] = await Promise.all([
    contracts.businessLicense.userOf(tokenId),
    contracts.businessLicense.userExpires(tokenId),
    contracts.businessLicense.serverOf(tokenId),
    contracts.businessLicense.kindOf(tokenId)
  ]);
  return { user, expires: Number(expires), serverId: Number(serverId), kind };
}

export async function verifyPropertyLease(tokenId: number) {
  if (!contracts.property) throw new Error("Property contract not configured");
  const [user, expires, serverId, kind] = await Promise.all([
    contracts.property.userOf(tokenId),
    contracts.property.userExpires(tokenId),
    contracts.property.serverOf(tokenId),
    contracts.property.kindOf(tokenId)
  ]);
  return { user, expires: Number(expires), serverId: Number(serverId), kind };
}

export async function placeAuctionBid(auctionId: number, amount: bigint) {
  logger.info({ auctionId, amount: amount.toString() }, "placing auction bid");
  const tx = await contracts.rentAuction.bid(auctionId, amount);
  const rc = await tx.wait();
  return rc?.hash;
}
