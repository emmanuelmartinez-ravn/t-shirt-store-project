import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { RoleAlreadyExistsError } from '../../domain/errors/role-already-exists';
import { RoleNotFoundError } from '../../domain/errors/role-not-found';
import { Role } from '../../domain/models/role';
import { RolesPersistenceMapper } from '../mappers/roles-persistence.mapper';
import { RoleRepository } from './role.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const RECORD_NOT_FOUND = 'P2025';

@Injectable()
export class PrismaRoleRepository extends RoleRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createRole(role: Role): Promise<Role> {
    try {
      const record = await this.prisma.role.create({
        data: {
          id: role.id,
          name: role.name,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
        },
      });

      return RolesPersistenceMapper.toDomain(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new RoleAlreadyExistsError(role.name);
      }
      throw error;
    }
  }

  async getAllRoles(): Promise<Role[]> {
    const records = await this.prisma.role.findMany({
      where: { deletedAt: null },
    });

    return records.map((record) => RolesPersistenceMapper.toDomain(record));
  }

  async updateRole(role: Role): Promise<Role> {
    try {
      const record = await this.prisma.role.update({
        where: { id: role.id },
        data: {
          name: role.name,
          updatedAt: role.updatedAt,
        },
      });

      return RolesPersistenceMapper.toDomain(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === UNIQUE_CONSTRAINT_VIOLATION) {
          throw new RoleAlreadyExistsError(role.name);
        }
        if (error.code === RECORD_NOT_FOUND) {
          throw new RoleNotFoundError(role.id);
        }
      }
      throw error;
    }
  }

  async deleteRole(role: Role): Promise<Role> {
    try {
      const record = await this.prisma.role.update({
        where: { id: role.id },
        data: {
          updatedAt: role.updatedAt,
          deletedAt: role.deletedAt,
        },
      });

      return RolesPersistenceMapper.toDomain(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === RECORD_NOT_FOUND
      ) {
        throw new RoleNotFoundError(role.id);
      }
      throw error;
    }
  }

  async getRoleByName(name: string): Promise<Role | null> {
    const record = await this.prisma.role.findFirst({
      where: { name, deletedAt: null },
    });

    return record ? RolesPersistenceMapper.toDomain(record) : null;
  }

  async getRoleById(id: string): Promise<Role | null> {
    const record = await this.prisma.role.findUnique({ where: { id } });

    return record ? RolesPersistenceMapper.toDomain(record) : null;
  }
}
