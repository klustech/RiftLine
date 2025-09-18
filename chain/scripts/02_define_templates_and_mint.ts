import { ethers } from "hardhat";
import { load, save } from "./utils";
import * as dotenv from "dotenv";

dotenv.config();

type WeaponRow = {
  templateId: number;
  kindNs: string;
  kindName: string;
  dmg: number; rof: number; rangeM: number; acc: number; recoil: number; mag: number; reloadCS: number;
  tier: number; flags: number; price: number;
};

const F = { Stun:1, Knockback:2, ArmorPierce:4, Incendiary:8, EMP:16, Suppressed:32, Bleed:64 } as const;

const WEAPONS: WeaponRow[] = [
  { templateId:1001, kindNs:"WEAPON", kindName:"COMBAT_KNIFE", dmg:35, rof:120, rangeM:2, acc:80, recoil:0, mag:1, reloadCS:0, tier:1, flags:F.Bleed, price:400 },
  { templateId:1002, kindNs:"WEAPON", kindName:"BAT", dmg:28, rof:110, rangeM:2, acc:75, recoil:0, mag:1, reloadCS:0, tier:1, flags:F.Knockback, price:300 },
  { templateId:1003, kindNs:"WEAPON", kindName:"CROWBAR", dmg:30, rof:110, rangeM:2, acc:76, recoil:0, mag:1, reloadCS:0, tier:1, flags:0, price:450 },
  { templateId:1004, kindNs:"WEAPON", kindName:"PISTOL_9MM", dmg:22, rof:450, rangeM:45, acc:70, recoil:30, mag:15, reloadCS:20, tier:1, flags:0, price:1500 },
  { templateId:1005, kindNs:"WEAPON", kindName:"PISTOL_45", dmg:28, rof:420, rangeM:45, acc:72, recoil:36, mag:12, reloadCS:22, tier:2, flags:0, price:2200 },
  { templateId:1006, kindNs:"WEAPON", kindName:"HEAVY_PISTOL", dmg:34, rof:360, rangeM:50, acc:68, recoil:45, mag:9,  reloadCS:24, tier:3, flags:F.ArmorPierce, price:3500 },
  { templateId:1007, kindNs:"WEAPON", kindName:"AUTO_PISTOL", dmg:20, rof:900, rangeM:40, acc:60, recoil:48, mag:20, reloadCS:24, tier:3, flags:0, price:3200 },
  { templateId:1008, kindNs:"WEAPON", kindName:"SILENCED_9MM", dmg:20, rof:420, rangeM:45, acc:74, recoil:28, mag:15, reloadCS:22, tier:2, flags:F.Suppressed, price:2800 },
  { templateId:1009, kindNs:"WEAPON", kindName:"MICRO_SMG", dmg:19, rof:1100, rangeM:45, acc:58, recoil:55, mag:30, reloadCS:28, tier:2, flags:0, price:4000 },
  { templateId:1010, kindNs:"WEAPON", kindName:"MP5", dmg:22, rof:800, rangeM:55, acc:72, recoil:40, mag:30, reloadCS:30, tier:3, flags:F.Suppressed, price:6000 },
  { templateId:1011, kindNs:"WEAPON", kindName:"VECTOR", dmg:23, rof:1200, rangeM:50, acc:70, recoil:52, mag:25, reloadCS:28, tier:4, flags:0, price:7000 },
  { templateId:1012, kindNs:"WEAPON", kindName:"PUMP_SHOTGUN", dmg:70, rof:80, rangeM:18, acc:52, recoil:90, mag:6, reloadCS:90, tier:2, flags:0, price:5500 },
  { templateId:1013, kindNs:"WEAPON", kindName:"TACTICAL_SEMI", dmg:55, rof:240, rangeM:20, acc:58, recoil:75, mag:8, reloadCS:80, tier:3, flags:0, price:8000 },
  { templateId:1014, kindNs:"WEAPON", kindName:"AUTO_SHOTGUN", dmg:45, rof:420, rangeM:20, acc:56, recoil:80, mag:12, reloadCS:85, tier:4, flags:0, price:11000 },
  { templateId:1015, kindNs:"WEAPON", kindName:"CARBINE_AR", dmg:28, rof:750, rangeM:80, acc:78, recoil:50, mag:30, reloadCS:70, tier:3, flags:0, price:9000 },
  { templateId:1016, kindNs:"WEAPON", kindName:"AK_VARIANT", dmg:32, rof:650, rangeM:75, acc:70, recoil:60, mag:30, reloadCS:72, tier:3, flags:0, price:9500 },
  { templateId:1017, kindNs:"WEAPON", kindName:"BULLPUP_AR", dmg:30, rof:800, rangeM:85, acc:82, recoil:48, mag:30, reloadCS:68, tier:4, flags:0, price:10500 },
  { templateId:1018, kindNs:"WEAPON", kindName:"BATTLE_RIFLE_308", dmg:38, rof:500, rangeM:100, acc:82, recoil:65, mag:20, reloadCS:76, tier:4, flags:F.ArmorPierce, price:14000 },
  { templateId:1019, kindNs:"WEAPON", kindName:"HUNTING_SNIPER", dmg:85, rof:40, rangeM:250, acc:92, recoil:95, mag:5, reloadCS:120, tier:4, flags:0, price:16000 },
  { templateId:1020, kindNs:"WEAPON", kindName:"SEMI_SNIPER", dmg:70, rof:220, rangeM:220, acc:90, recoil:85, mag:10, reloadCS:110, tier:4, flags:0, price:18500 },
  { templateId:1021, kindNs:"WEAPON", kindName:"AP_SNIPER", dmg:95, rof:30, rangeM:260, acc:94, recoil:98, mag:5, reloadCS:130, tier:5, flags:F.ArmorPierce, price:24000 },
  { templateId:1022, kindNs:"WEAPON", kindName:"LMG", dmg:26, rof:800, rangeM:90, acc:75, recoil:80, mag:100, reloadCS:140, tier:5, flags:0, price:20000 },
  { templateId:1023, kindNs:"WEAPON", kindName:"GRENADE_LAUNCHER", dmg:120, rof:30, rangeM:60, acc:70, recoil:99, mag:1, reloadCS:200, tier:5, flags:0, price:22000 },
  { templateId:1024, kindNs:"WEAPON", kindName:"RPG", dmg:220, rof:15, rangeM:80, acc:68, recoil:99, mag:1, reloadCS:240, tier:5, flags:0, price:30000 },
  { templateId:1025, kindNs:"WEAPON", kindName:"EMP_LAUNCHER", dmg:0, rof:20, rangeM:50, acc:80, recoil:30, mag:4, reloadCS:160, tier:4, flags:F.EMP, price:18000 },
  { templateId:1026, kindNs:"WEAPON", kindName:"TASER", dmg:0, rof:50, rangeM:10, acc:95, recoil:0, mag:1, reloadCS:80, tier:2, flags:F.Stun, price:2000 },
  { templateId:1027, kindNs:"WEAPON", kindName:"INCENDIARY_SMG", dmg:18, rof:800, rangeM:45, acc:66, recoil:55, mag:30, reloadCS:30, tier:4, flags:F.Incendiary, price:8500 },
  { templateId:1028, kindNs:"WEAPON", kindName:"PRECISION_PISTOL", dmg:26, rof:420, rangeM:60, acc:86, recoil:30, mag:12, reloadCS:22, tier:3, flags:0, price:3800 },
  { templateId:1029, kindNs:"WEAPON", kindName:"DMR", dmg:34, rof:520, rangeM:140, acc:88, recoil:70, mag:20, reloadCS:80, tier:4, flags:0, price:12000 },
  { templateId:1030, kindNs:"WEAPON", kindName:"SUPP_CARBINE", dmg:28, rof:750, rangeM:80, acc:80, recoil:48, mag:30, reloadCS:70, tier:3, flags:F.Suppressed, price:10200 }
];

const VEHICLES = [
  ["Compact",        {maxKph:150, accelMs:900, handling:62, fuel:45, seats:4, vclass:0, armor:0, flags:0, price:15000}],
  ["Sedan",          {maxKph:170, accelMs:860, handling:68, fuel:55, seats:4, vclass:1, armor:0, flags:0, price:22000}],
  ["LuxurySedan",    {maxKph:195, accelMs:720, handling:80, fuel:60, seats:4, vclass:1, armor:1, flags:0, price:40000}],
  ["SmallSUV",       {maxKph:165, accelMs:880, handling:72, fuel:65, seats:4, vclass:2, armor:0, flags:1, price:28000}],
  ["LargeSUV",       {maxKph:180, accelMs:850, handling:70, fuel:80, seats:6, vclass:2, armor:0, flags:1|8, price:36000}],
  ["Van",            {maxKph:155, accelMs:1050, handling:55, fuel:90, seats:8, vclass:3, armor:0, flags:0, price:24000}],
  ["Pickup",         {maxKph:175, accelMs:840, handling:68, fuel:75, seats:4, vclass:4, armor:0, flags:1|8, price:30000}],
  ["Sports",         {maxKph:260, accelMs:450, handling:86, fuel:60, seats:2, vclass:5, armor:0, flags:2, price:120000}],
  ["Supercar",       {maxKph:320, accelMs:310, handling:92, fuel:55, seats:2, vclass:6, armor:0, flags:4, price:350000}],
  ["ClassicSports",  {maxKph:240, accelMs:490, handling:80, fuel:55, seats:2, vclass:5, armor:0, flags:0, price:95000}],
  ["StreetBike",     {maxKph:240, accelMs:350, handling:84, fuel:18, seats:2, vclass:7, armor:0, flags:0, price:45000}],
  ["DirtBike",       {maxKph:180, accelMs:410, handling:76, fuel:14, seats:1, vclass:7, armor:0, flags:1, price:18000}],
  ["TouringBike",    {maxKph:200, accelMs:420, handling:78, fuel:22, seats:2, vclass:7, armor:0, flags:0, price:28000}],
  ["Taxi",           {maxKph:175, accelMs:870, handling:68, fuel:55, seats:4, vclass:8, armor:0, flags:0, price:26000}],
  ["PoliceCruiser",  {maxKph:240, accelMs:470, handling:88, fuel:60, seats:4, vclass:9, armor:1, flags:16, price:80000}],
  ["Ambulance",      {maxKph:170, accelMs:890, handling:66, fuel:90, seats:4, vclass:9, armor:0, flags:16, price:70000}],
  ["FireTruck",      {maxKph:140, accelMs:1100,handling:50, fuel:180,seats:4, vclass:9, armor:0, flags:0,  price:150000}],
  ["TowTruck",       {maxKph:150, accelMs:1000,handling:52, fuel:120,seats:2, vclass:9, armor:0, flags:8,  price:50000}],
  ["ArmoredVan",     {maxKph:170, accelMs:780, handling:65, fuel:120,seats:2, vclass:10,armor:3, flags:32, price:200000}],
  ["BoxTruck",       {maxKph:130, accelMs:1200,handling:45, fuel:150,seats:2, vclass:11,armor:0, flags:0,  price:65000}],
  ["SemiTractor",    {maxKph:135, accelMs:1400,handling:40, fuel:300,seats:2, vclass:11,armor:0, flags:8,  price:120000}],
  ["Bus",            {maxKph:120, accelMs:1400,handling:40, fuel:200,seats:40,vclass:11,armor:0, flags:0,  price:100000}],
  ["RallyCar",       {maxKph:220, accelMs:430, handling:86, fuel:55, seats:2, vclass:5, armor:0, flags:1,  price:110000}],
  ["StreetTuner",    {maxKph:240, accelMs:400, handling:88, fuel:55, seats:2, vclass:5, armor:0, flags:2,  price:140000}],
  ["ArmoredSUV",     {maxKph:200, accelMs:610, handling:78, fuel:85, seats:4, vclass:2, armor:2, flags:32, price:180000}]
];

const APARTMENTS = [
  ["Studio",        {tier:1, garage:1, storageSlots:10, perks:1,   price:20000}],
  ["OneBedroom",    {tier:2, garage:2, storageSlots:16, perks:3,   price:45000}],
  ["TwoBedroom",    {tier:3, garage:3, storageSlots:22, perks:7,   price:75000}],
  ["Loft",          {tier:4, garage:4, storageSlots:28, perks:15,  price:120000}],
  ["Penthouse",     {tier:5, garage:6, storageSlots:36, perks:31,  price:250000}],
  ["SkyPenthouse",  {tier:6, garage:8, storageSlots:48, perks:63,  price:500000}]
];

async function main() {
  const state = load();
  const item = await ethers.getContractAt("Item1155", state.Item1155);
  const registry = await ethers.getContractAt("ServerRegistry", state.ServerRegistry);
  const vehicle = await ethers.getContractAt("VehicleNFT", state.VehicleNFT);
  const apartment = await ethers.getContractAt("ApartmentNFT", state.ApartmentNFT);
  const SALE = state.SaleWallet as string;

  for (const w of WEAPONS) {
    const packed = await item._encode(w.dmg, w.rof, w.rangeM, w.acc, w.recoil, w.mag, w.reloadCS, w.tier, w.flags);
    const kind = await registry.kindKey(w.kindNs, `T${w.templateId}`);
    const tx = await item.defineWeaponTemplate(w.templateId, kind, packed, w.price);
    await tx.wait();
    console.log(`Defined template ${w.templateId} (${w.kindName}) price ${w.price}`);
  }

  for (const [name, s] of VEHICLES) {
    const tx = await vehicle.mint(SALE, s);
    const rc = await tx.wait();
    const tokenId = rc!.logs?.[0] ? Number(rc!.logs[0].args?.tokenId) : "n/a";
    console.log(`Vehicle minted: ${name} -> ${tokenId}`);
  }

  for (const [name, a] of APARTMENTS) {
    const tx = await apartment.mint(SALE, a);
    const rc = await tx.wait();
    const tokenId = rc!.logs?.[0] ? Number(rc!.logs[0].args?.tokenId) : "n/a";
    console.log(`Apartment minted: ${name} -> ${tokenId}`);
  }

  save(state);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
