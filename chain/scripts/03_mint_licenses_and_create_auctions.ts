import { ethers } from "hardhat";
import { load, save, now, oneDay } from "./utils";

async function main() {
  const state = load();
  const registry = await ethers.getContractAt("ServerRegistry", state.ServerRegistry);
  const license = await ethers.getContractAt("BusinessLicenseNFT", state.BusinessLicenseNFT);
  const auction = await ethers.getContractAt("RentAuction", state.RentAuction);

  const SERVERS = state.__SERVERS as Array<{id:number,name:string}>;
  const BUSINESSES = state.__BUSINESSES as Array<{ns:string,name:string,cap:number,reserve:number,floor:number,minInc:number,leaseDays:number}>;

  const start = now() + 15 * 60;
  const end   = start + 7 * oneDay;
  const leaseSeconds = 7 * oneDay;

  const minted: { serverId:number; tokenId:number; kind:string }[] = [];

  for (const s of SERVERS) {
    for (const b of BUSINESSES) {
      const kind = await registry.kindKey(b.ns, b.name);
      for (let i = 0; i < b.cap; i++) {
        const tx = await license.mint(s.id, kind);
        const rc = await tx.wait();
        const ev = rc!.logs.find((l:any) => l.fragment?.name === "Transfer");
        const tokenId = ev?.args?.tokenId ? Number(ev.args.tokenId) : undefined;
        if (tokenId === undefined) {
          console.warn(`Could not parse tokenId for ${b.ns}:${b.name} on server ${s.id}`);
          continue;
        }
        minted.push({ serverId: s.id, tokenId, kind: `${b.ns}:${b.name}` });
        console.log(`Minted License tokenId=${tokenId} kind=${b.ns}:${b.name} server=${s.id}`);
      }
    }
  }

  for (const s of SERVERS) {
    for (const b of BUSINESSES) {
      const list = minted.filter(m => m.serverId === s.id && m.kind === `${b.ns}:${b.name}`);
      for (const m of list) {
        const tx = await auction.createLot(
          m.tokenId,
          start,
          end,
          leaseSeconds,
          b.reserve,
          b.minInc
        );
        await tx.wait();
        console.log(`Auction created for tokenId=${m.tokenId} ${b.ns}:${b.name} server=${s.id} reserve=${b.reserve}`);
      }
    }
  }

  save(state);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
