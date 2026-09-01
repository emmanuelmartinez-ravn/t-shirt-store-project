import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';

const MANAGER_ROLE_NAME = 'manager';
const PASSWORD_SALT_ROUNDS = 10;

const MANAGER_USER = {
  firstName: 'Admin',
  lastName: 'Manager',
  email: 'manager@tshirt-store.com',
  password: 'Manager1!',
};

export async function seedManagerUser(prisma: PrismaClient): Promise<void> {
  const existingManagerUser = await prisma.user.findFirst({
    where: { email: MANAGER_USER.email, deletedAt: null },
  });

  if (existingManagerUser) {
    console.log(`User "${MANAGER_USER.email}" already exists, skipping`);
    return;
  }

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
  const createdUser = await prisma.user.create({
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
  await prisma.cart.create({ data: { userId: createdUser.id } });
  console.log(
    `Created manager user "${MANAGER_USER.email}" (password: "${MANAGER_USER.password}")`,
  );
}
