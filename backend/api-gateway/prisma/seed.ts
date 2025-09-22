import { PrismaClient, PlayerKycStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.shard.createMany({
    data: [
      { id: 1, name: "Shore City", population: 0 },
      { id: 2, name: "Highlands", population: 0 }
    ],
    skipDuplicates: true
  });

  await prisma.player.upsert({
    where: { wallet: "system:treasury" },
    update: {},
    create: {
      wallet: "system:treasury",
      username: "treasury",
      kycStatus: PlayerKycStatus.verified
    }
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
