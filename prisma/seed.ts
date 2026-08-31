import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';

const ROLE_NAMES = ['manager', 'client'];
const MANAGER_ROLE_NAME = 'manager';
const PASSWORD_SALT_ROUNDS = 10;

const MANAGER_USER = {
  firstName: 'Admin',
  lastName: 'Manager',
  email: 'manager@tshirt-store.com',
  password: 'Manager1!',
};

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

    const existingManagerUser = await prisma.user.findFirst({
      where: { email: MANAGER_USER.email, deletedAt: null },
    });

    if (existingManagerUser) {
      console.log(`User "${MANAGER_USER.email}" already exists, skipping`);
    } else {
      const managerRole = await prisma.role.findFirst({
        where: { name: MANAGER_ROLE_NAME, deletedAt: null },
      });

      if (!managerRole) {
        throw new Error(
          `Role "${MANAGER_ROLE_NAME}" not found - it should have been seeded above`,
        );
      }

      const hashedPassword = await bcrypt.hash(
        MANAGER_USER.password,
        PASSWORD_SALT_ROUNDS,
      );
      await prisma.user.create({
        data: {
          firstName: MANAGER_USER.firstName,
          lastName: MANAGER_USER.lastName,
          email: MANAGER_USER.email,
          hashedPassword,
          avatar: '',
          disabled: false,
          roleId: managerRole.id,
        },
      });
      console.log(
        `Created manager user "${MANAGER_USER.email}" (password: "${MANAGER_USER.password}")`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
