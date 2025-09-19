import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const ZERO_ADDRESS = ethers.ZeroAddress;

async function deployContract<T extends ethers.BaseContract>(name: string): Promise<T> {
  const factory = await ethers.getContractFactory(name);
  const contract = (await factory.deploy()) as T;
  await contract.waitForDeployment();
  return contract;
}

describe("RiftLine v2 on-chain suite", () => {
  it("manages vehicle lifecycle with leasing, seizure and destruction", async () => {
    const [admin, seller, renter, custodian] = await ethers.getSigners();

    const vehicle = await deployContract("VehicleNFT");
    await vehicle.initialize(admin.address, "ipfs://vehicles/");

    await vehicle.connect(admin).grantRole(await vehicle.CUSTODIAN_ROLE(), custodian.address);

    const specs = {
      maxKph: 220,
      accelMs: 40,
      handling: 85,
      fuel: 90,
      seats: 4,
      vclass: 1,
      armor: 0,
      flags: 0,
      price: 1_000,
    };

    await vehicle.connect(admin).mint(seller.address, specs);

    const leaseExpiry = (await time.latest()) + 3600;
    await vehicle.connect(seller).setUser(1, renter.address, leaseExpiry);
    expect(await vehicle.userOf(1)).to.equal(renter.address);

    await time.increaseTo(leaseExpiry + 5);
    expect(await vehicle.userOf(1)).to.equal(ZERO_ADDRESS);

    await vehicle.connect(custodian).seize(1, admin.address);
    expect(await vehicle.ownerOf(1)).to.equal(admin.address);

    await vehicle.connect(admin).destroy(1);
    expect(await vehicle.destroyed(1)).to.equal(true);
    await expect(vehicle.ownerOf(1)).to.be.reverted;
  });

  it("allows apartment rentals with eviction after expiry", async () => {
    const [admin, owner, tenant] = await ethers.getSigners();

    const apartment = await deployContract("ApartmentNFT");
    await apartment.initialize(admin.address, "ipfs://apartments/", admin.address, 500);

    const aptConfig = { tier: 2, garage: 1, storageSlots: 10, perks: 3, price: 5_000 };
    await apartment.connect(admin).mint(owner.address, aptConfig);

    const expiry = (await time.latest()) + 1800;
    await apartment.connect(owner).setUser(1, tenant.address, expiry);
    expect(await apartment.userOf(1)).to.equal(tenant.address);

    await time.increaseTo(expiry + 10);
    await apartment.connect(tenant).clearUser(1);
    expect(await apartment.userOf(1)).to.equal(ZERO_ADDRESS);
  });

  it("processes primary sales through the asset marketplace", async () => {
    const [admin, seller, buyer, feeRecipient] = await ethers.getSigners();

    const vehicle = await deployContract("VehicleNFT");
    await vehicle.initialize(admin.address, "ipfs://vehicles/");
    const specs = {
      maxKph: 200,
      accelMs: 45,
      handling: 80,
      fuel: 85,
      seats: 2,
      vclass: 0,
      armor: 0,
      flags: 0,
      price: 800,
    };
    await vehicle.connect(admin).mint(seller.address, specs);

    const marketplace = await deployContract("AssetMarketplace");
    await marketplace.initialize(admin.address, feeRecipient.address, 500);

    await vehicle.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
    await marketplace
      .connect(seller)
      .createListing(await vehicle.getAddress(), 1, ZERO_ADDRESS, ethers.parseEther("1"), 0);

    await expect(() =>
      marketplace.connect(buyer).fillListing(1, { value: ethers.parseEther("1") })
    ).to.changeEtherBalances(
      [buyer, seller, feeRecipient],
      [ethers.parseEther("-1"), ethers.parseEther("0.95"), ethers.parseEther("0.05")]
    );

    expect(await vehicle.ownerOf(1)).to.equal(buyer.address);

    await expect(marketplace.connect(admin).cancelListing(1)).to.be.revertedWith("inactive");
  });

  it("synchronizes identity and role badges with entitlement registry", async () => {
    const [admin, player] = await ethers.getSigners();
    const entitlement = await deployContract("EntitlementRegistry");
    await entitlement.initialize(admin.address);

    const passport = await deployContract("CitizenPassport");
    await passport.initialize(admin.address, "ipfs://passports/");
    await passport.connect(admin).setEntitlementRegistry(await entitlement.getAddress());
    await entitlement.connect(admin).setIssuer(await passport.getAddress(), true);

    const roleBadge = await deployContract("RoleBadge");
    await roleBadge.initialize(admin.address, "ipfs://badges/{id}");
    await roleBadge.connect(admin).setEntitlementRegistry(await entitlement.getAddress());
    await entitlement.connect(admin).setIssuer(await roleBadge.getAddress(), true);

    const cityId = ethers.id("riftline-city-1");
    const citizenEntitlement = await passport.entitlementId(cityId);
    await passport.connect(admin).issue(player.address, cityId, ethers.id("profile"));
    expect(await entitlement.hasEntitlement(player.address, citizenEntitlement)).to.equal(true);

    const policeEntitlement = ethers.id("POLICE_BADGE");
    await roleBadge.connect(admin).defineBadge(1, policeEntitlement);
    await roleBadge.connect(admin).issue(player.address, 1, 0);
    expect(await entitlement.hasEntitlement(player.address, policeEntitlement)).to.equal(true);

    await roleBadge.connect(admin).revoke(player.address, 1);
    expect(await entitlement.hasEntitlement(player.address, policeEntitlement)).to.equal(false);

    await passport.connect(admin).revoke(player.address);
    expect(await entitlement.hasEntitlement(player.address, citizenEntitlement)).to.equal(false);
  });

  it("grants business operating rights when licenses are leased", async () => {
    const [admin, vault, operator] = await ethers.getSigners();
    const registry = await deployContract("ServerRegistry");
    await registry.initialize(admin.address);
    await registry.connect(admin).registerServer(1, "Shard One");

    const business = await deployContract("BusinessLicenseNFT");
    await business.initialize(admin.address, registry, vault.address, "ipfs://business/");
    await business.connect(admin).grantRole(await business.MINTER_ROLE(), admin.address);
    await registry.connect(admin).grantRole(await registry.MINTER_ROLE(), await business.getAddress());
    const kind = await registry.kindKey("business", "bar");
    await registry.connect(admin).setCap(1, kind, 5);

    const entitlement = await deployContract("EntitlementRegistry");
    await entitlement.initialize(admin.address);
    await entitlement.connect(admin).setIssuer(await business.getAddress(), true);
    await business.connect(admin).setEntitlementRegistry(entitlement);
    const entitlementId = ethers.id("BUSINESS_BAR");
    await business.connect(admin).setKindEntitlement(kind, entitlementId);

    await business.connect(admin).mint(1, kind);
    const leaseExpiry = BigInt(await time.latest()) + 600n;
    await business.connect(admin).setUser(1, operator.address, leaseExpiry);
    expect(await entitlement.hasEntitlement(operator.address, entitlementId)).to.equal(true);

    await business.connect(admin).clearUser(1);
    expect(await entitlement.hasEntitlement(operator.address, entitlementId)).to.equal(false);
  });

  it("tracks session keys for account abstraction consumers", async () => {
    const [admin, account, executor, sessionKey] = await ethers.getSigners();

    const registry = await deployContract("SessionKeyRegistry");
    await registry.initialize(admin.address);
    await registry.connect(admin).grantRole(await registry.EXECUTOR_ROLE(), executor.address);

    const nowTs = await time.latest();
    const scope = ethers.id("mint");
    await registry
      .connect(account)
      .registerSessionKey(sessionKey.address, scope, nowTs, nowTs + 3600, 2);

    expect(await registry.isSessionValid(account.address, sessionKey.address, scope)).to.equal(true);

    await registry.connect(executor).consumeSession(account.address, sessionKey.address, scope);
    const [, , , , used] = await registry.session(account.address, sessionKey.address);
    expect(used).to.equal(1);

    await registry.connect(executor).consumeSession(account.address, sessionKey.address, scope);
    expect(await registry.isSessionValid(account.address, sessionKey.address, scope)).to.equal(false);
  });

  it("executes governance proposals via timelock", async () => {
    const [admin, voter] = await ethers.getSigners();

    const token = await deployContract("RiftToken");
    await token.initialize(admin.address);
    await token.connect(admin).grantRole(await token.MINTER_ROLE(), admin.address);
    await token.connect(admin).mint(voter.address, ethers.parseEther("5000"));
    await token.connect(voter).delegate(voter.address);

    const timelock = await deployContract("CityTimelock");
    await timelock.initialize(1, [], [], admin.address);

    const governor = await deployContract("CityGovernor");
    await governor.initialize(
      admin.address,
      token,
      timelock,
      1,
      5,
      ethers.parseEther("1000"),
      4
    );

    await timelock.connect(admin).grantRole(await timelock.PROPOSER_ROLE(), await governor.getAddress());
    await timelock.connect(admin).grantRole(await timelock.EXECUTOR_ROLE(), ZERO_ADDRESS);

    const registry = await deployContract("ServerRegistry");
    await registry.initialize(admin.address);
    await registry.connect(admin).registerServer(1, "Shard One");
    const kind = await registry.kindKey("vehicle", "sports");
    await registry.connect(admin).grantRole(await registry.SERVER_MANAGER_ROLE(), await timelock.getAddress());

    const description = "Set sports vehicle cap";
    const calldata = registry.interface.encodeFunctionData("setCap", [1, kind, 25]);
    const proposeTx = await governor.connect(voter).propose(
      [await registry.getAddress()],
      [0],
      [calldata],
      description
    );
    const proposalId = (await proposeTx.wait())!.logs[0].args!.proposalId;

    await time.advanceBlock();
    await governor.connect(voter).castVote(proposalId, 1);
    await time.advanceBlockTo((await time.latestBlock()) + 6);

    const descriptionHash = ethers.id(description);
    await governor.queue([await registry.getAddress()], [0], [calldata], descriptionHash);
    await time.increase(2);
    await governor.execute([await registry.getAddress()], [0], [calldata], descriptionHash);

    expect(await registry.serverCaps(1, kind)).to.equal(25n);
  });
});
