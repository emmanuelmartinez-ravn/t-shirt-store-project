import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PaginatedResult } from '../../../common/pagination/paginated-result';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { ProductVariantAlreadyExistsError } from '../../domain/errors/product-variant-already-exists';
import { ProductVariant } from '../../domain/models/product-variant';
import { ProductVariantPersistenceMapper } from '../mappers/product-variant-persistence.mapper';
import { ProductVariantRepository } from './product-variant.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PrismaProductVariantRepository extends ProductVariantRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createProductVariant(variant: ProductVariant): Promise<ProductVariant> {
    try {
      const record = await this.prisma.productVariant.create({
        data: {
          id: variant.id,
          sku: variant.sku,
          price: variant.price,
          stock: variant.stock,
          disabled: variant.disabled,
          attributes: variant.attributes,
          createdAt: variant.createdAt,
          updatedAt: variant.updatedAt,
          productId: variant.productId,
        },
      });

      return ProductVariantPersistenceMapper.toDomain(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ProductVariantAlreadyExistsError(variant.sku);
      }
      throw error;
    }
  }

  async getAllProductVariants(params: {
    productId: string;
    page: number;
    limit: number;
    disabled: boolean;
    liked?: boolean;
    userId?: string;
  }): Promise<PaginatedResult<ProductVariant>> {
    const { productId, page, limit, disabled, liked, userId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductVariantWhereInput = {
      productId,
      deletedAt: null,
      disabled,
      ...(liked === true && userId
        ? { likedProductVariants: { some: { userId } } }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.productVariant.findMany({ where, skip, take: limit }),
      this.prisma.productVariant.count({ where }),
    ]);

    return {
      items: records.map((record) =>
        ProductVariantPersistenceMapper.toDomain(record),
      ),
      total,
    };
  }

  async getProductVariantById(id: string): Promise<ProductVariant | null> {
    const record = await this.prisma.productVariant.findUnique({
      where: { id },
    });
    return record ? ProductVariantPersistenceMapper.toDomain(record) : null;
  }
}
