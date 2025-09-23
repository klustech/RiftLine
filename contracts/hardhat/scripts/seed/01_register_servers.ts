import { ethers } from "hardhat";

async function main() {
  const registryAddress = process.env.REGISTRY;
  if (!registryAddress) {
    throw new Error("REGISTRY env var is required");
  }

  const registry = await ethers.getContractAt("ServerRegistry", registryAddress);

  await (await registry.registerServer(1, "Downtown")).wait();
  await (await registry.registerServer(2, "Harbor")).wait();

  const kindKey = (ns: string, name: string) =>
    ethers.keccak256(ethers.toUtf8Bytes(`${ns}:${name}`));

  await (await registry.setCap(1, kindKey("PROPERTY", "DowntownShop"), 20)).wait();
  await (await registry.setCap(2, kindKey("PROPERTY", "HarborWarehouse"), 12)).wait();
  await (await registry.setCap(1, kindKey("LICENSE", "Taxi"), 200)).wait();
  await (await registry.setCap(1, kindKey("LICENSE", "Nightclub"), 8)).wait();
  await (await registry.setCap(1, kindKey("ITEM", "Fuel"), 1_000_000)).wait();

  console.log("Servers and caps registered");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
