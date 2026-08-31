import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const ROLE_NAMES = ['manager', 'client'];

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    for (const name of ROLE_NAMES) {
      const existing = await prisma.role.findFirst({
        where: { name, deletedAt: null },
      });

      if (existing) {
        console.log(`Role "${name}" already exists, skipping`);
        continue;
      }

      await prisma.role.create({ data: { name } });
      console.log(`Created role "${name}"`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
