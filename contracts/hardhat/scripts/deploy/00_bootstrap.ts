import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(deployer.address);
  await treasury.waitForDeployment();

  const RiftToken = await ethers.getContractFactory("RiftlineToken");
  const token = await RiftToken.deploy(deployer.address);
  await token.waitForDeployment();

  const ServerRegistry = await ethers.getContractFactory("ServerRegistry");
  const registry = await ServerRegistry.deploy(deployer.address);
  await registry.waitForDeployment();

  const PropertyVault = await ethers.getContractFactory("PropertyVault");
  const vault = await PropertyVault.deploy(deployer.address);
  await vault.waitForDeployment();

  const ApartmentNFT = await ethers.getContractFactory("ApartmentNFT");
  const apartments = await ApartmentNFT.deploy(deployer.address, 500, 5000, "ipfs://apts/");
  await apartments.waitForDeployment();

  const PropertyNFT = await ethers.getContractFactory("PropertyNFT");
  const properties = await PropertyNFT.deploy(deployer.address, "ipfs://props/");
  await properties.waitForDeployment();

  const BusinessLicenseNFT = await ethers.getContractFactory("BusinessLicenseNFT");
  const licenses = await BusinessLicenseNFT.deploy(deployer.address, "ipfs://lic/");
  await licenses.waitForDeployment();

  const Item1155 = await ethers.getContractFactory("Item1155");
  const items = await Item1155.deploy(deployer.address, await registry.getAddress(), "ipfs://items/{id}.json");
  await items.waitForDeployment();

  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(deployer.address, await treasury.getAddress(), 250);
  await marketplace.waitForDeployment();

  const RentAuction = await ethers.getContractFactory("RentAuction");
  const auction = await RentAuction.deploy(deployer.address, await treasury.getAddress());
  await auction.waitForDeployment();

  await (await properties.grantRole(await properties.MANAGER_ROLE(), await auction.getAddress())).wait();
  await (await licenses.grantRole(await licenses.MANAGER_ROLE(), await auction.getAddress())).wait();

  await (await registry.grantRole(await registry.MINTER_ROLE(), deployer.address)).wait();
  await (await registry.grantRole(await registry.AUCTIONEER_ROLE(), await auction.getAddress())).wait();
  await (await items.grantRole(await items.MINTER_ROLE(), deployer.address)).wait();

  console.log(`treasury=${await treasury.getAddress()}`);
  console.log(`token=${await token.getAddress()}`);
  console.log(`registry=${await registry.getAddress()}`);
  console.log(`vault=${await vault.getAddress()}`);
  console.log(`apartments=${await apartments.getAddress()}`);
  console.log(`properties=${await properties.getAddress()}`);
  console.log(`licenses=${await licenses.getAddress()}`);
  console.log(`items=${await items.getAddress()}`);
  console.log(`marketplace=${await marketplace.getAddress()}`);
  console.log(`auction=${await auction.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
