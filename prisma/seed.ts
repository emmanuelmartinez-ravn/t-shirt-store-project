import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const ROLE_NAMES = ['manager', 'client'];
const PASSWORD_SALT_ROUNDS = 10;
const MANAGER_EMAIL =
  process.env.SEED_MANAGER_EMAIL ?? 'manager@tshirt-store.com';
const MANAGER_PASSWORD = process.env.SEED_MANAGER_PASSWORD ?? 'Manager123!';

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

    await seedManagerUser(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function seedManagerUser(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.user.findFirst({
    where: { email: MANAGER_EMAIL, deletedAt: null },
  });

  if (existing) {
    console.log(`User "${MANAGER_EMAIL}" already exists, skipping`);
    return;
  }

  const managerRole = await prisma.role.findFirst({
    where: { name: 'manager', deletedAt: null },
  });

  if (!managerRole) {
    throw new Error('Role "manager" not found, cannot seed manager user');
  }

  const hashedPassword = await bcrypt.hash(
    MANAGER_PASSWORD,
    PASSWORD_SALT_ROUNDS,
  );

  await prisma.user.create({
    data: {
      firstName: 'Store',
      lastName: 'Manager',
      email: MANAGER_EMAIL,
      hashedPassword,
      avatar: '',
      disabled: false,
      roleId: managerRole.id,
    },
  });
  console.log(`Created manager user "${MANAGER_EMAIL}"`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
