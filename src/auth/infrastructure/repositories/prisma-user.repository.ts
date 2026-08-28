import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { UserAlreadyExistsError } from '../../domain/errors/user-already-exists';
import { User } from '../../domain/models/user';
import { UserPersistenceMapper } from '../mappers/user-persistence.mapper';
import { UserRepository } from './user.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createUser(user: User): Promise<User> {
    try {
      const record = await this.prisma.user.create({
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

      return UserPersistenceMapper.toDomain(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new UserAlreadyExistsError(user.email);
      }
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });

    return record ? UserPersistenceMapper.toDomain(record) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    return record ? UserPersistenceMapper.toDomain(record) : null;
  }

  async activateUser(user: User): Promise<User> {
    const record = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        disabled: user.disabled,
        updatedAt: user.updatedAt,
      },
    });

    return UserPersistenceMapper.toDomain(record);
  }
}
