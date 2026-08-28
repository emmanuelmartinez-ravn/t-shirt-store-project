import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { UserAlreadyExistsError } from '../../domain/errors/user-already-exists';
import { User } from '../../domain/models/user';
import { PrismaUserRepository } from './prisma-user.repository';

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let prisma: {
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  const user = User.restore({
    id: 'user-id',
    firstName: 'Joe',
    lastName: 'Doe',
    email: 'joe.doe@example.com',
    hashedPassword: 'hashed',
    avatar: '',
    disabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    roleId: 'role-id',
  });

  beforeEach(() => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new PrismaUserRepository(prisma as unknown as PrismaService);
  });

  describe('createUser', () => {
    it('persists the user and returns the mapped domain entity', async () => {
      prisma.user.create.mockResolvedValue({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        hashedPassword: user.hashedPassword,
        avatar: user.avatar,
        disabled: user.disabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletedAt: null,
        roleId: user.roleId,
      });

      const result = await repository.createUser(user);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          hashedPassword: user.hashedPassword,
          avatar: user.avatar,
          disabled: user.disabled,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          roleId: user.roleId,
        },
      });
      expect(result).toEqual(user);
    });

    it('translates a unique constraint violation into UserAlreadyExistsError', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.createUser(user)).rejects.toThrow(
        UserAlreadyExistsError,
      );
    });

    it('rethrows unrelated errors unchanged', async () => {
      prisma.user.create.mockRejectedValue(new Error('connection lost'));

      await expect(repository.createUser(user)).rejects.toThrow(
        'connection lost',
      );
    });
  });

  describe('getUserById', () => {
    it('returns the mapped domain entity when the user exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        hashedPassword: user.hashedPassword,
        avatar: user.avatar,
        disabled: user.disabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletedAt: null,
        roleId: user.roleId,
      });

      const result = await repository.getUserById('user-id');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
      expect(result).toEqual(user);
    });

    it('returns null when no user matches the id', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.getUserById('missing');

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('returns the mapped domain entity when a live user matches', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        hashedPassword: user.hashedPassword,
        avatar: user.avatar,
        disabled: user.disabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletedAt: null,
        roleId: user.roleId,
      });

      const result = await repository.getUserByEmail(user.email);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: user.email, deletedAt: null },
      });
      expect(result).toEqual(user);
    });

    it('returns null when no live user matches', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await repository.getUserByEmail('missing@example.com');

      expect(result).toBeNull();
    });
  });

  describe('activateUser', () => {
    it('activates the user and returns the mapped domain entity', async () => {
      const activatedUser = User.restore({ ...user, disabled: false });
      prisma.user.update.mockResolvedValue({
        id: activatedUser.id,
        firstName: activatedUser.firstName,
        lastName: activatedUser.lastName,
        email: activatedUser.email,
        hashedPassword: activatedUser.hashedPassword,
        avatar: activatedUser.avatar,
        disabled: false,
        createdAt: activatedUser.createdAt,
        updatedAt: activatedUser.updatedAt,
        deletedAt: null,
        roleId: activatedUser.roleId,
      });

      const result = await repository.activateUser(activatedUser);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: activatedUser.id },
        data: {
          disabled: false,
          updatedAt: activatedUser.updatedAt,
        },
      });
      expect(result).toEqual(activatedUser);
    });
  });
});
