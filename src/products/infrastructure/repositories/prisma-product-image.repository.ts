import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { ProductImageNotFoundError } from '../../domain/errors/product-image-not-found';
import { ProductImage } from '../../domain/models/product-image';
import { ProductImagesPersistenceMapper } from '../mappers/product-images-persistence.mapper';
import { ProductImageRepository } from './product-image.repository';

const RECORD_NOT_FOUND = 'P2025';

@Injectable()
export class PrismaProductImageRepository extends ProductImageRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async countActiveImages(productId: string): Promise<number> {
    return this.prisma.productImage.count({
      where: { productId, deletedAt: null },
    });
  }

  async createImages(images: ProductImage[]): Promise<void> {
    await this.prisma.productImage.createMany({
      data: images.map((image) =>
        ProductImagesPersistenceMapper.toPersistence(image),
      ),
    });
  }

  async getActiveImagesByProductIds(
    productIds: string[],
  ): Promise<ProductImage[]> {
    if (productIds.length === 0) {
      return [];
    }

    const records = await this.prisma.productImage.findMany({
      where: { productId: { in: productIds }, deletedAt: null },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return records.map((record) =>
      ProductImagesPersistenceMapper.toDomain(record),
    );
  }

  async getActiveImageById(id: string): Promise<ProductImage | null> {
    const record = await this.prisma.productImage.findFirst({
      where: { id, deletedAt: null },
    });

    return record ? ProductImagesPersistenceMapper.toDomain(record) : null;
  }

  async deleteImage(image: ProductImage): Promise<ProductImage> {
    try {
      const record = await this.prisma.productImage.update({
        where: { id: image.id, deletedAt: null },
        data: {
          updatedAt: image.updatedAt,
          deletedAt: image.deletedAt,
        },
      });

      return ProductImagesPersistenceMapper.toDomain(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === RECORD_NOT_FOUND
      ) {
        throw new ProductImageNotFoundError(image.id);
      }
      throw error;
    }
  }
}
