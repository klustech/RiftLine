import { ethers, upgrades } from "hardhat";
import { save, load, roles } from "./utils";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const VAULT = process.env.VAULT_ADDRESS!;
  const SALE = process.env.SALE_WALLET!;
  if (!VAULT || !SALE) throw new Error("Set VAULT_ADDRESS and SALE_WALLET in .env");

  const baseUriLic = process.env.BASE_URI_LICENSE || "";
  const baseUri1155 = process.env.BASE_URI_ITEM1155 || "";
  const baseUriVeh = process.env.BASE_URI_VEHICLE || "";
  const baseUriApt = process.env.BASE_URI_APART || "";

  const ServerRegistry = await ethers.getContractFactory("ServerRegistry");
  const registry = await upgrades.deployProxy(ServerRegistry, [deployer.address], { kind: "uups" });
  await registry.waitForDeployment();
  console.log("ServerRegistry:", await registry.getAddress());

  const RiftToken = await ethers.getContractFactory("RiftToken");
  const rft = await upgrades.deployProxy(RiftToken, [deployer.address], { kind: "uups" });
  await rft.waitForDeployment();
  console.log("RiftToken:", await rft.getAddress());

  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await upgrades.deployProxy(Treasury, [deployer.address, await rft.getAddress()], { kind: "uups" });
  await treasury.waitForDeployment();
  console.log("Treasury:", await treasury.getAddress());

  const BusinessLicenseNFT = await ethers.getContractFactory("BusinessLicenseNFT");
  const license = await upgrades.deployProxy(
    BusinessLicenseNFT,
    [deployer.address, await registry.getAddress(), VAULT, baseUriLic],
    { kind: "uups" }
  );
  await license.waitForDeployment();
  console.log("BusinessLicenseNFT:", await license.getAddress());

  const Item1155 = await ethers.getContractFactory("Item1155");
  const item1155 = await upgrades.deployProxy(
    Item1155,
    [deployer.address, await registry.getAddress(), baseUri1155],
    { kind: "uups" }
  );
  await item1155.waitForDeployment();
  console.log("Item1155:", await item1155.getAddress());

  const RentAuction = await ethers.getContractFactory("RentAuction");
  const auction = await upgrades.deployProxy(
    RentAuction,
    [deployer.address, await rft.getAddress(), await license.getAddress(), await treasury.getAddress()]
  , { kind: "uups" });
  await auction.waitForDeployment();
  console.log("RentAuction:", await auction.getAddress());

  const VehicleNFT = await ethers.getContractFactory("VehicleNFT");
  const vehicle = await upgrades.deployProxy(
    VehicleNFT,
    [deployer.address, baseUriVeh],
    { kind: "uups" }
  );
  await vehicle.waitForDeployment();
  console.log("VehicleNFT:", await vehicle.getAddress());

  const ApartmentNFT = await ethers.getContractFactory("ApartmentNFT");
  const apartment = await upgrades.deployProxy(
    ApartmentNFT,
    [deployer.address, baseUriApt, await treasury.getAddress(), 500],
    { kind: "uups" }
  );
  await apartment.waitForDeployment();
  console.log("ApartmentNFT:", await apartment.getAddress());

  await (await rft.grantRole(roles.RFT.MINTER_ROLE, await treasury.getAddress())).wait();
  await (await registry.grantRole(roles.REGISTRY.MINTER_ROLE, await license.getAddress())).wait();
  await (await registry.grantRole(roles.REGISTRY.MINTER_ROLE, await item1155.getAddress())).wait();
  await (await license.grantRole(roles.LICENSE.MINTER_ROLE, (await ethers.getSigners())[0].address)).wait();
  await (await license.grantRole(roles.LICENSE.ADMIN_ROLE, await auction.getAddress())).wait();
  await (await treasury.grantRole(roles.TREASURY.EMITTER_ROLE, deployer.address)).wait();

  const state = load();
  Object.assign(state, {
    ServerRegistry: await registry.getAddress(),
    RiftToken: await rft.getAddress(),
    Treasury: await treasury.getAddress(),
    BusinessLicenseNFT: await license.getAddress(),
    Item1155: await item1155.getAddress(),
    RentAuction: await auction.getAddress(),
    VehicleNFT: await vehicle.getAddress(),
    ApartmentNFT: await apartment.getAddress(),
    Vault: VAULT,
    SaleWallet: SALE
  });
  save(state);
}

main().catch((e) => { console.error(e); process.exit(1); });
