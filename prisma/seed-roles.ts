import { PrismaClient } from '../generated/prisma/client';

const ROLE_NAMES = ['manager', 'client'];

export async function seedRoles(prisma: PrismaClient): Promise<void> {
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
}
