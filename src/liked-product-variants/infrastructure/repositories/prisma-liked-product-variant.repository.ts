import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { AlreadyLikedError } from '../../domain/errors/already-liked';
import { LikedProductVariant } from '../../domain/models/liked-product-variant';
import { LikedProductVariantPersistenceMapper } from '../mappers/liked-product-variant-persistence.mapper';
import { LikedProductVariantRepository } from './liked-product-variant.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PrismaLikedProductVariantRepository extends LikedProductVariantRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async like(
    likedProductVariant: LikedProductVariant,
  ): Promise<LikedProductVariant> {
    try {
      const record = await this.prisma.likedProductVariant.create({
        data: {
          id: likedProductVariant.id,
          userId: likedProductVariant.userId,
          productVariantId: likedProductVariant.productVariantId,
          createdAt: likedProductVariant.createdAt,
          updatedAt: likedProductVariant.updatedAt,
        },
      });

      return LikedProductVariantPersistenceMapper.toDomain(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new AlreadyLikedError(
          likedProductVariant.userId,
          likedProductVariant.productVariantId,
        );
      }
      throw error;
    }
  }

  async unlike(userId: string, productVariantId: string): Promise<boolean> {
    const { count } = await this.prisma.likedProductVariant.deleteMany({
      where: { userId, productVariantId },
    });

    return count > 0;
  }
}
