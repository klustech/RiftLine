import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const WeaponNFT = await ethers.getContractFactory("WeaponNFT");
  const weapon = await upgrades.deployProxy(
    WeaponNFT,
    [deployer.address, deployer.address, 500],
    { initializer: "initialize" }
  );
  await weapon.deployed();

  const Item1155 = await ethers.getContractFactory("Item1155");
  const items = await upgrades.deployProxy(
    Item1155,
    [deployer.address, "https://example.com/{id}.json"],
    { initializer: "initialize" }
  );
  await items.deployed();

  const WeaponEquip = await ethers.getContractFactory("WeaponEquip");
  const equip = await upgrades.deployProxy(
    WeaponEquip,
    [deployer.address, weapon.address, items.address],
    { initializer: "initialize" }
  );
  await equip.deployed();

  const Crafting = await ethers.getContractFactory("Crafting");
  const craft = await upgrades.deployProxy(
    Crafting,
    [deployer.address, weapon.address, items.address, 1],
    { initializer: "initialize" }
  );
  await craft.deployed();

  console.log("WeaponNFT:", weapon.address);
  console.log("Item1155:", items.address);
  console.log("WeaponEquip:", equip.address);
  console.log("Crafting:", craft.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
