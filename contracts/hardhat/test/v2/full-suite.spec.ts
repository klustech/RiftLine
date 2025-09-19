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

  it("tracks character progression, attributes and metadata updates", async () => {
    const [admin, player, gm] = await ethers.getSigners();

    const character = await deployContract("PlayerCharacter");
    await character.initialize(admin.address, "ipfs://characters/");
    await character.connect(admin).grantRole(await character.GAME_SERVER_ROLE(), gm.address);
    await character.connect(admin).grantRole(await character.METADATA_ROLE(), gm.address);

    const archetype = ethers.id("scout");
    const homeShard = ethers.id("rift-shard-1");
    const initial = {
      level: 1,
      experience: 0,
      reputation: 5,
      lastActivityAt: 0,
      archetype,
      homeShard,
    };

    await character.connect(admin).mint(player.address, initial, "ipfs://characters/1", ethers.id("metadata:v1"));

    expect(await character.characterIdOf(player.address)).to.equal(1n);

    const progression = {
      level: 6,
      experience: 4200,
      reputation: 77,
      lastActivityAt: 123456,
      archetype,
      homeShard,
    };
    await character.connect(gm).syncProgression(1, progression);
    const stored = await character.progressionOf(1);
    expect(stored.level).to.equal(6);
    expect(stored.experience).to.equal(4200);

    const strengthKey = ethers.id("ATTR:STRENGTH");
    await character.connect(gm).setAttributes(1, [{ key: strengthKey, value: 42 }]);
    expect(await character.attributeOf(1, strengthKey)).to.equal(42);

    const loadoutSlot = ethers.id("LOADOUT:PRIMARY");
    const rifleItem = ethers.id("ITEM:PLASMA_RIFLE");
    await character.connect(gm).setLoadout(1, [{ slot: loadoutSlot, item: rifleItem }]);
    expect(await character.equipmentOf(1, loadoutSlot)).to.equal(rifleItem);

    await character.connect(gm).setMetadataURI(1, "ipfs://characters/1?rev=2", ethers.id("metadata:v2"));
    expect(await character.tokenURI(1)).to.equal("ipfs://characters/1?rev=2");
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
    await token.connect(admin).mint(voter.address, ethers.parseEther("100"));
    await token.connect(voter).delegate(voter.address);

    const character = await deployContract("PlayerCharacter");
    await character.initialize(admin.address, "ipfs://characters/");
    const baseProfile = {
      level: 1,
      experience: 0,
      reputation: 0,
      lastActivityAt: 0,
      archetype: ethers.id("citizen"),
      homeShard: ethers.id("downtown"),
    };
    await character.connect(admin).mint(voter.address, baseProfile, "", ethers.ZeroHash);
    await character.connect(voter).delegate(voter.address);

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

    await governor
      .connect(admin)
      .setAdditionalVoteSource(await character.getAddress(), ethers.parseEther("1000"));

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

  it("processes cross-shard travel requests with relayer confirmations", async () => {
    const [admin, player, relayer] = await ethers.getSigners();

    const registry = await deployContract("ServerRegistry");
    await registry.initialize(admin.address);
    await registry.connect(admin).registerServer(1, "Oldtown");
    await registry.connect(admin).registerServer(2, "Harbor");

    const gateway = await deployContract("CrossServerGateway");
    await gateway.initialize(admin.address, registry);
    await gateway.connect(admin).grantRole(await gateway.RELAYER_ROLE(), relayer.address);
    await gateway.connect(admin).setInitialShard(player.address, 1);

    const payload = ethers.encodeBytes32String("sync-inventory");
    await gateway.connect(player).requestTransfer(1, 2, payload);
    const transferId = await gateway.activeTransferOf(player.address);
    expect(transferId).to.equal(1n);

    const arrivalPayload = ethers.encodeBytes32String("arrived");
    await gateway.connect(relayer).commitTransfer(transferId, arrivalPayload);

    const ackPayload = ethers.encodeBytes32String("ack");
    await gateway.connect(player).finalizeTransfer(transferId, ackPayload);
    expect(await gateway.currentShardOf(player.address)).to.equal(2);
    expect(await gateway.activeTransferOf(player.address)).to.equal(0n);

    await gateway.connect(player).requestTransfer(2, 1, "0x1234");
    const cancelId = await gateway.activeTransferOf(player.address);
    await gateway.connect(admin).cancelTransfer(cancelId);
    expect(await gateway.activeTransferOf(player.address)).to.equal(0n);
  });

  it("validates paymaster sponsorships against session keys", async () => {
    const [admin, account, sessionKey, entryPoint] = await ethers.getSigners();

    const registry = await deployContract("SessionKeyRegistry");
    await registry.initialize(admin.address);

    const paymaster = await deployContract("SessionKeyPaymaster");
    await paymaster.initialize(admin.address, entryPoint.address, registry, admin.address);
    await registry.connect(admin).grantRole(await registry.EXECUTOR_ROLE(), await paymaster.getAddress());
    expect(await paymaster.verifyingSigner()).to.equal(admin.address);

    const nowTs = await time.latest();
    const scope = ethers.id("MARKET_MINT");
    await registry
      .connect(account)
      .registerSessionKey(sessionKey.address, scope, nowTs, nowTs + 3600, 1);

    const verificationGas = 150000n;
    const callGas = 200000n;
    const preVerificationGas = 50000n;
    const maxPriorityFee = ethers.toBigInt(ethers.parseUnits("1", "gwei"));
    const maxFee = ethers.toBigInt(ethers.parseUnits("10", "gwei"));
    const paymasterVerificationGas = 180000n;
    const postOpGas = 60000n;
    const header = ethers.solidityPacked(
      ["address", "uint128", "uint128"],
      [await paymaster.getAddress(), paymasterVerificationGas, postOpGas]
    );

    const accountGasLimits = ethers.zeroPadValue(
      ethers.toBeHex((verificationGas << 128n) | callGas),
      32
    );
    const gasFees = ethers.zeroPadValue(ethers.toBeHex((maxPriorityFee << 128n) | maxFee), 32);

    const packedWithoutSig: any = [
      account.address,
      0n,
      "0x",
      "0x",
      accountGasLimits,
      preVerificationGas,
      gasFees,
      header,
      "0x",
    ];

    const validUntil = nowTs + 1800;
    const validAfter = nowTs;
    const digest = await paymaster.getSponsorDigest(
      packedWithoutSig,
      sessionKey.address,
      scope,
      validUntil,
      validAfter
    );
    const signature = await admin.signMessage(ethers.getBytes(digest));

    const tail = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint48", "uint48", "address", "bytes32", "bytes"],
      [validUntil, validAfter, sessionKey.address, scope, signature]
    );
    const paymasterAndData = ethers.hexlify(ethers.concat([header, tail]));

    const packedOp: any = [
      account.address,
      0n,
      "0x",
      "0x",
      accountGasLimits,
      preVerificationGas,
      gasFees,
      paymasterAndData,
      "0x",
    ];

    expect(await registry.isSessionValid(account.address, sessionKey.address, scope)).to.equal(true);

    const rawResponse = await paymaster
      .connect(entryPoint)
      .validatePaymasterUserOp.staticCall(packedOp, ethers.ZeroHash, 0);
    const context = ((rawResponse as any).context ?? (rawResponse as any)[0] ?? "0x") as string;
    expect(context).to.not.equal("0x");
    const validationData = (rawResponse as any).validationData ?? (rawResponse as any)[1] ?? 0n;

    const validationBigInt = BigInt(validationData);
    expect(validationBigInt & 1n).to.equal(0n);
    const contextBytes = ethers.getBytes((context as string) ?? "0x");
    await paymaster.connect(entryPoint).postOp(0, contextBytes, 0, 0);
    expect(await registry.isSessionValid(account.address, sessionKey.address, scope)).to.equal(false);
  });
});
