import { ethers } from "hardhat";

const now = () => Math.floor(Date.now() / 1000);

async function main() {
  const requiredEnv = ["REGISTRY", "PROPERTY", "LICENSE", "VAULT", "ITEMS", "APTS", "MARKET", "AUCTION"] as const;
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  const [operator] = await ethers.getSigners();

  const properties = await ethers.getContractAt("PropertyNFT", process.env.PROPERTY!);
  const licenses = await ethers.getContractAt("BusinessLicenseNFT", process.env.LICENSE!);
  const vault = await ethers.getContractAt("PropertyVault", process.env.VAULT!);
  const items = await ethers.getContractAt("Item1155", process.env.ITEMS!);
  const apartments = await ethers.getContractAt("ApartmentNFT", process.env.APTS!);
  const marketplace = await ethers.getContractAt("Marketplace", process.env.MARKET!);
  const auction = await ethers.getContractAt("RentAuction", process.env.AUCTION!);

  for (let i = 0; i < 6; i += 1) {
    const meta = ethers.keccak256(ethers.toUtf8Bytes(`APT:${i}`));
    const previewId = await apartments.callStatic.mint(operator.address, meta);
    await (await apartments.mint(operator.address, meta)).wait();
    console.log(`Apartment minted: ${previewId.toString()}`);
  }

  await (await marketplace.list721(await apartments.getAddress(), 1, ethers.ZeroAddress, ethers.parseEther("0.5"))).wait();

  const propDowntown = ethers.keccak256(ethers.toUtf8Bytes("PROPERTY:DowntownShop"));
  const propHarbor = ethers.keccak256(ethers.toUtf8Bytes("PROPERTY:HarborWarehouse"));

  await (
    await properties.mintToVault(
      await vault.getAddress(),
      1,
      propDowntown,
      ethers.keccak256(ethers.toUtf8Bytes("geo:dt:001"))
    )
  ).wait();
  await (
    await properties.mintToVault(
      await vault.getAddress(),
      2,
      propHarbor,
      ethers.keccak256(ethers.toUtf8Bytes("geo:hb:001"))
    )
  ).wait();

  const licenseTaxi = ethers.keccak256(ethers.toUtf8Bytes("LICENSE:Taxi"));
  const licenseClub = ethers.keccak256(ethers.toUtf8Bytes("LICENSE:Nightclub"));

  await (await licenses.mintToVault(await vault.getAddress(), 1, licenseTaxi)).wait();
  await (await licenses.mintToVault(await vault.getAddress(), 1, licenseClub)).wait();

  await (
    await items.mintServer(
      operator.address,
      1,
      1,
      5000,
      "ipfs://items/fuel.json",
      "0x"
    )
  ).wait();

  const start = now() + 60;
  const end = start + 600;
  const lease = 2 * 60 * 60;
  const feeBps = 250;

  await (
    await auction.createAuction(
      0,
      await properties.getAddress(),
      1,
      ethers.ZeroAddress,
      start,
      end,
      lease,
      ethers.parseEther("0.05"),
      await vault.getAddress(),
      feeBps
    )
  ).wait();

  await (
    await auction.createAuction(
      1,
      await licenses.getAddress(),
      1,
      ethers.ZeroAddress,
      start,
      end,
      lease,
      ethers.parseEther("0.02"),
      await vault.getAddress(),
      feeBps
    )
  ).wait();

  console.log("Seed data applied");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
