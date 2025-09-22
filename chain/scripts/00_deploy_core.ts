import { ethers, upgrades } from "hardhat";
import { save, load, roles } from "./utils";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const baseUriLicense = process.env.BASE_URI_LICENSE ?? "";
  const baseUriItem = process.env.BASE_URI_ITEM1155 ?? "";
  const baseUriVehicle = process.env.BASE_URI_VEHICLE ?? "";
  const baseUriApartment = process.env.BASE_URI_APART ?? "";
  const baseUriProperty = process.env.BASE_URI_PROPERTY ?? "";
  const baseUriCharacter = process.env.BASE_URI_CHARACTER ?? "";

  const ServerRegistry = await ethers.getContractFactory("ServerRegistry");
  const registry = await upgrades.deployProxy(ServerRegistry, [deployer.address], { kind: "uups" });
  await registry.waitForDeployment();

  const RiftToken = await ethers.getContractFactory("RiftToken");
  const rft = await upgrades.deployProxy(RiftToken, [deployer.address], { kind: "uups" });
  await rft.waitForDeployment();

  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await upgrades.deployProxy(Treasury, [deployer.address, await rft.getAddress()], { kind: "uups" });
  await treasury.waitForDeployment();

  const CharacterSBT = await ethers.getContractFactory("CharacterSBT");
  const characters = await CharacterSBT.deploy(deployer.address, baseUriCharacter);
  await characters.waitForDeployment();

  const PropertyVault = await ethers.getContractFactory("PropertyVault");
  const vault = await PropertyVault.deploy(deployer.address);
  await vault.waitForDeployment();

  const PropertyNFT = await ethers.getContractFactory("PropertyNFT");
  const property = await PropertyNFT.deploy(deployer.address, baseUriProperty);
  await property.waitForDeployment();

  const BusinessLicenseNFT = await ethers.getContractFactory("BusinessLicenseNFT");
  const license = await upgrades.deployProxy(
    BusinessLicenseNFT,
    [deployer.address, await registry.getAddress(), await vault.getAddress(), baseUriLicense],
    { kind: "uups" }
  );
  await license.waitForDeployment();

  const Item1155 = await ethers.getContractFactory("Item1155");
  const item1155 = await upgrades.deployProxy(
    Item1155,
    [deployer.address, await registry.getAddress(), baseUriItem],
    { kind: "uups" }
  );
  await item1155.waitForDeployment();

  const VehicleNFT = await ethers.getContractFactory("VehicleNFT");
  const vehicle = await upgrades.deployProxy(
    VehicleNFT,
    [deployer.address, baseUriVehicle],
    { kind: "uups" }
  );
  await vehicle.waitForDeployment();

  const ApartmentNFT = await ethers.getContractFactory("ApartmentNFT");
  const apartment = await upgrades.deployProxy(
    ApartmentNFT,
    [deployer.address, baseUriApartment, await treasury.getAddress(), 500],
    { kind: "uups" }
  );
  await apartment.waitForDeployment();

  const RentAuction = await ethers.getContractFactory("RentAuction");
  const auction = await upgrades.deployProxy(
    RentAuction,
    [deployer.address, await rft.getAddress(), await license.getAddress(), await treasury.getAddress()],
    { kind: "uups" }
  );
  await auction.waitForDeployment();

  const AssetMarketplace = await ethers.getContractFactory("AssetMarketplace");
  const marketplace = await upgrades.deployProxy(
    AssetMarketplace,
    [deployer.address, await treasury.getAddress(), 250],
    { kind: "uups" }
  );
  await marketplace.waitForDeployment();

  // role wiring
  await (await rft.grantRole(roles.RFT.MINTER_ROLE, await treasury.getAddress())).wait();
  await (await treasury.grantRole(roles.TREASURY.EMITTER_ROLE, deployer.address)).wait();

  await (await registry.grantRole(roles.REGISTRY.MINTER_ROLE, await license.getAddress())).wait();
  await (await registry.grantRole(roles.REGISTRY.MINTER_ROLE, await item1155.getAddress())).wait();

  await (await license.grantRole(roles.LICENSE.ADMIN_ROLE, await auction.getAddress())).wait();
  await (await property.grantRole(roles.PROPERTY.MANAGER_ROLE, await auction.getAddress())).wait();

  const state = load();
  Object.assign(state, {
    ServerRegistry: await registry.getAddress(),
    RiftToken: await rft.getAddress(),
    Treasury: await treasury.getAddress(),
    CharacterSBT: await characters.getAddress(),
    PropertyVault: await vault.getAddress(),
    PropertyNFT: await property.getAddress(),
    BusinessLicenseNFT: await license.getAddress(),
    Item1155: await item1155.getAddress(),
    VehicleNFT: await vehicle.getAddress(),
    ApartmentNFT: await apartment.getAddress(),
    RentAuction: await auction.getAddress(),
    AssetMarketplace: await marketplace.getAddress()
  });
  save(state);

  console.table({
    ServerRegistry: await registry.getAddress(),
    RiftToken: await rft.getAddress(),
    Treasury: await treasury.getAddress(),
    CharacterSBT: await characters.getAddress(),
    PropertyVault: await vault.getAddress(),
    PropertyNFT: await property.getAddress(),
    BusinessLicenseNFT: await license.getAddress(),
    Item1155: await item1155.getAddress(),
    VehicleNFT: await vehicle.getAddress(),
    ApartmentNFT: await apartment.getAddress(),
    RentAuction: await auction.getAddress(),
    AssetMarketplace: await marketplace.getAddress()
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
