import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { CategoryAlreadyExistsError } from '../../domain/errors/category-already-exists';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found';
import { Category } from '../../domain/models/category';
import { CategoriesPersistenceMapper } from '../mappers/categories-persistence.mapper';
import { CategoryRepository } from './category.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const RECORD_NOT_FOUND = 'P2025';

@Injectable()
export class PrismaCategoryRepository extends CategoryRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createCategory(category: Category): Promise<Category> {
    try {
      const record = await this.prisma.category.create({
        data: {
          id: category.id,
          name: category.name,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        },
      });

      return CategoriesPersistenceMapper.toDomain(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new CategoryAlreadyExistsError(category.name);
      }
      throw error;
    }
  }

  async getAllCategories(): Promise<Category[]> {
    const records = await this.prisma.category.findMany({
      where: { deletedAt: null },
    });

    return records.map((record) =>
      CategoriesPersistenceMapper.toDomain(record),
    );
  }

  async updateCategory(category: Category): Promise<Category> {
    try {
      const record = await this.prisma.category.update({
        where: { id: category.id },
        data: {
          name: category.name,
          updatedAt: category.updatedAt,
        },
      });

      return CategoriesPersistenceMapper.toDomain(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === UNIQUE_CONSTRAINT_VIOLATION) {
          throw new CategoryAlreadyExistsError(category.name);
        }
        if (error.code === RECORD_NOT_FOUND) {
          throw new CategoryNotFoundError(category.id);
        }
      }
      throw error;
    }
  }

  async deleteCategory(category: Category): Promise<Category> {
    try {
      const record = await this.prisma.category.update({
        where: { id: category.id },
        data: {
          updatedAt: category.updatedAt,
          deletedAt: category.deletedAt,
        },
      });

      return CategoriesPersistenceMapper.toDomain(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === RECORD_NOT_FOUND
      ) {
        throw new CategoryNotFoundError(category.id);
      }
      throw error;
    }
  }

  async getCategoryById(id: string): Promise<Category | null> {
    const record = await this.prisma.category.findUnique({ where: { id } });

    return record ? CategoriesPersistenceMapper.toDomain(record) : null;
  }
}
