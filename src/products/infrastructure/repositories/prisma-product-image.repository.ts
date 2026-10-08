import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { ProductImage } from '../../domain/models/product-image';
import { ProductImagesPersistenceMapper } from '../mappers/product-images-persistence.mapper';
import { ProductImageRepository } from './product-image.repository';

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
}
