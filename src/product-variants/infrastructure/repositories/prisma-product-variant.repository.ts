import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
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
}
