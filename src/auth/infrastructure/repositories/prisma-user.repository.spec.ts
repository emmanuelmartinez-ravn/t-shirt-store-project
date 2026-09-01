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

  describe('promoteUser', () => {
    it('promotes the user and returns the mapped domain entity', async () => {
      const promotedUser = User.promote(user, 'manager-role-id');
      prisma.user.update.mockResolvedValue({
        id: promotedUser.id,
        firstName: promotedUser.firstName,
        lastName: promotedUser.lastName,
        email: promotedUser.email,
        hashedPassword: promotedUser.hashedPassword,
        avatar: promotedUser.avatar,
        disabled: promotedUser.disabled,
        createdAt: promotedUser.createdAt,
        updatedAt: promotedUser.updatedAt,
        deletedAt: null,
        roleId: promotedUser.roleId,
      });

      const result = await repository.promoteUser(promotedUser);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: promotedUser.id },
        data: {
          roleId: promotedUser.roleId,
          updatedAt: promotedUser.updatedAt,
        },
      });
      expect(result).toEqual(promotedUser);
    });
  });

  describe('updatePassword', () => {
    it('updates the hashed password and returns the mapped domain entity', async () => {
      const updatedUser = User.changePassword(user, 'new-hashed');
      prisma.user.update.mockResolvedValue({
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        hashedPassword: updatedUser.hashedPassword,
        avatar: updatedUser.avatar,
        disabled: updatedUser.disabled,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        deletedAt: null,
        roleId: updatedUser.roleId,
      });

      const result = await repository.updatePassword(updatedUser);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: updatedUser.id },
        data: {
          hashedPassword: 'new-hashed',
          updatedAt: updatedUser.updatedAt,
        },
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('setDisabled', () => {
    it('persists the disabled flag and returns the mapped domain entity', async () => {
      const disabledUser = User.setDisabled(user, false);
      prisma.user.update.mockResolvedValue({
        id: disabledUser.id,
        firstName: disabledUser.firstName,
        lastName: disabledUser.lastName,
        email: disabledUser.email,
        hashedPassword: disabledUser.hashedPassword,
        avatar: disabledUser.avatar,
        disabled: disabledUser.disabled,
        createdAt: disabledUser.createdAt,
        updatedAt: disabledUser.updatedAt,
        deletedAt: null,
        roleId: disabledUser.roleId,
      });

      const result = await repository.setDisabled(disabledUser);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: disabledUser.id },
        data: {
          disabled: false,
          updatedAt: disabledUser.updatedAt,
        },
      });
      expect(result).toEqual(disabledUser);
    });
  });

  describe('updateProfile', () => {
    it('updates the name and returns the mapped domain entity', async () => {
      const updatedUser = User.updateProfile(user, {
        firstName: 'Jane',
        lastName: 'Smith',
      });
      prisma.user.update.mockResolvedValue({
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        hashedPassword: updatedUser.hashedPassword,
        avatar: updatedUser.avatar,
        disabled: updatedUser.disabled,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        deletedAt: null,
        roleId: updatedUser.roleId,
      });

      const result = await repository.updateProfile(updatedUser);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: updatedUser.id },
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          updatedAt: updatedUser.updatedAt,
        },
      });
      expect(result).toEqual(updatedUser);
    });
  });
});
