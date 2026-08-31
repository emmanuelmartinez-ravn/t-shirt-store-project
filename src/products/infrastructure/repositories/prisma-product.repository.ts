import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PaginatedResult } from '../../../common/pagination/paginated-result';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { ProductAlreadyExistsError } from '../../domain/errors/product-already-exists';
import { ProductNotFoundError } from '../../domain/errors/product-not-found';
import { Product } from '../../domain/models/product';
import { ProductsPersistenceMapper } from '../mappers/products-persistence.mapper';
import { ProductRepository } from './product.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const RECORD_NOT_FOUND = 'P2025';

@Injectable()
export class PrismaProductRepository extends ProductRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createProduct(product: Product): Promise<Product> {
    try {
      const record = await this.prisma.product.create({
        data: {
          id: product.id,
          name: product.name,
          code: product.code,
          description: product.description,
          disabled: product.disabled,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          categoryId: product.categoryId,
        },
      });

      return ProductsPersistenceMapper.toDomain(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        const target = error.meta?.target;
        if (Array.isArray(target) && target.includes('name')) {
          throw new ProductAlreadyExistsError(product.name);
        }
      }
      throw error;
    }
  }

  async getAllProducts(params: {
    page: number;
    limit: number;
  }): Promise<PaginatedResult<Product>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { deletedAt: null },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where: { deletedAt: null } }),
    ]);

    return {
      items: records.map((record) =>
        ProductsPersistenceMapper.toDomain(record),
      ),
      total,
    };
  }

  async updateProduct(product: Product): Promise<Product> {
    try {
      const record = await this.prisma.product.update({
        where: { id: product.id },
        data: {
          name: product.name,
          description: product.description,
          categoryId: product.categoryId,
          updatedAt: product.updatedAt,
        },
      });

      return ProductsPersistenceMapper.toDomain(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === UNIQUE_CONSTRAINT_VIOLATION) {
          throw new ProductAlreadyExistsError(product.name);
        }
        if (error.code === RECORD_NOT_FOUND) {
          throw new ProductNotFoundError(product.id);
        }
      }
      throw error;
    }
  }

  async deleteProduct(product: Product): Promise<Product> {
    try {
      const record = await this.prisma.product.update({
        where: { id: product.id },
        data: {
          updatedAt: product.updatedAt,
          deletedAt: product.deletedAt,
        },
      });

      return ProductsPersistenceMapper.toDomain(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === RECORD_NOT_FOUND
      ) {
        throw new ProductNotFoundError(product.id);
      }
      throw error;
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    const record = await this.prisma.product.findUnique({ where: { id } });

    return record ? ProductsPersistenceMapper.toDomain(record) : null;
  }

  async getLastProductCode(): Promise<string | null> {
    const record = await this.prisma.product.findFirst({
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    return record?.code ?? null;
  }
}
