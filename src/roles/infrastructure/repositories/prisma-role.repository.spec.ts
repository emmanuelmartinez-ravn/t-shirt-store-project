import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { RoleAlreadyExistsError } from '../../domain/errors/role-already-exists';
import { RoleNotFoundError } from '../../domain/errors/role-not-found';
import { Role } from '../../domain/models/role';
import { PrismaRoleRepository } from './prisma-role.repository';

describe('PrismaRoleRepository', () => {
  let repository: PrismaRoleRepository;
  let prisma: {
    role: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  const role = Role.restore({
    id: 'role-id',
    name: 'client',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  beforeEach(() => {
    prisma = {
      role: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new PrismaRoleRepository(prisma as unknown as PrismaService);
  });

  describe('createRole', () => {
    it('persists the role and returns the mapped domain entity', async () => {
      prisma.role.create.mockResolvedValue({
        id: role.id,
        name: role.name,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        deletedAt: null,
      });

      const result = await repository.createRole(role);

      expect(prisma.role.create).toHaveBeenCalledWith({
        data: {
          id: role.id,
          name: role.name,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
        },
      });
      expect(result).toEqual(role);
    });

    it('translates a unique constraint violation into RoleAlreadyExistsError', async () => {
      prisma.role.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.createRole(role)).rejects.toThrow(
        RoleAlreadyExistsError,
      );
    });

    it('rethrows unrelated errors unchanged', async () => {
      prisma.role.create.mockRejectedValue(new Error('connection lost'));

      await expect(repository.createRole(role)).rejects.toThrow(
        'connection lost',
      );
    });
  });

  describe('getAllRoles', () => {
    it('returns all roles mapped to domain entities', async () => {
      prisma.role.findMany.mockResolvedValue([
        {
          id: role.id,
          name: role.name,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
          deletedAt: null,
        },
      ]);

      const result = await repository.getAllRoles();

      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
      expect(result).toEqual([role]);
    });
  });

  describe('updateRole', () => {
    it('updates the role and returns the mapped domain entity', async () => {
      prisma.role.update.mockResolvedValue({
        id: role.id,
        name: role.name,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        deletedAt: null,
      });

      const result = await repository.updateRole(role);

      expect(prisma.role.update).toHaveBeenCalledWith({
        where: { id: role.id },
        data: {
          name: role.name,
          updatedAt: role.updatedAt,
        },
      });
      expect(result).toEqual(role);
    });

    it('translates a unique constraint violation into RoleAlreadyExistsError', async () => {
      prisma.role.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.updateRole(role)).rejects.toThrow(
        RoleAlreadyExistsError,
      );
    });

    it('translates a record-not-found error into RoleNotFoundError', async () => {
      prisma.role.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.updateRole(role)).rejects.toThrow(
        RoleNotFoundError,
      );
    });

    it('rethrows unrelated errors unchanged', async () => {
      prisma.role.update.mockRejectedValue(new Error('connection lost'));

      await expect(repository.updateRole(role)).rejects.toThrow(
        'connection lost',
      );
    });
  });

  describe('deleteRole', () => {
    it('soft-deletes the role and returns the mapped domain entity', async () => {
      const deletedRole = Role.delete(role);
      prisma.role.update.mockResolvedValue({
        id: deletedRole.id,
        name: deletedRole.name,
        createdAt: deletedRole.createdAt,
        updatedAt: deletedRole.updatedAt,
        deletedAt: deletedRole.deletedAt,
      });

      const result = await repository.deleteRole(deletedRole);

      expect(prisma.role.update).toHaveBeenCalledWith({
        where: { id: deletedRole.id },
        data: {
          updatedAt: deletedRole.updatedAt,
          deletedAt: deletedRole.deletedAt,
        },
      });
      expect(result).toEqual(deletedRole);
    });

    it('translates a record-not-found error into RoleNotFoundError', async () => {
      prisma.role.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.deleteRole(role)).rejects.toThrow(
        RoleNotFoundError,
      );
    });

    it('rethrows unrelated errors unchanged', async () => {
      prisma.role.update.mockRejectedValue(new Error('connection lost'));

      await expect(repository.deleteRole(role)).rejects.toThrow(
        'connection lost',
      );
    });
  });

  describe('getRoleById', () => {
    it('returns the mapped domain entity when the role exists', async () => {
      prisma.role.findUnique.mockResolvedValue({
        id: role.id,
        name: role.name,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        deletedAt: null,
      });

      const result = await repository.getRoleById('role-id');

      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { id: 'role-id' },
      });
      expect(result).toEqual(role);
    });

    it('returns null when no role matches the id', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      const result = await repository.getRoleById('missing');

      expect(result).toBeNull();
    });
  });

  describe('getRoleByName', () => {
    it('returns the mapped domain entity when the role exists', async () => {
      prisma.role.findFirst.mockResolvedValue({
        id: role.id,
        name: role.name,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        deletedAt: null,
      });

      const result = await repository.getRoleByName('client');

      expect(prisma.role.findFirst).toHaveBeenCalledWith({
        where: { name: 'client', deletedAt: null },
      });
      expect(result).toEqual(role);
    });

    it('returns null when no role matches the name', async () => {
      prisma.role.findFirst.mockResolvedValue(null);

      const result = await repository.getRoleByName('missing');

      expect(result).toBeNull();
    });
  });
});
