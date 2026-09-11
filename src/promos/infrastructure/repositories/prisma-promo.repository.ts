import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { PromoNotFoundError } from '../../domain/errors/promo-not-found';
import { Promo } from '../../domain/models/promo';
import { PromosPersistenceMapper } from '../mappers/promos-persistence.mapper';
import { PromoRepository } from './promo.repository';

const RECORD_NOT_FOUND = 'P2025';

@Injectable()
export class PrismaPromoRepository extends PromoRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createPromo(promo: Promo): Promise<Promo> {
    const record = await this.prisma.promo.create({
      data: {
        id: promo.id,
        code: promo.code,
        type: PromosPersistenceMapper.toPersistenceType(promo.type),
        value: promo.value,
        expiration: promo.expiration,
        remainUsages: promo.remainUsages,
        minimumPurchaseAmount: promo.minimumPurchaseAmount,
        createdAt: promo.createdAt,
        updatedAt: promo.updatedAt,
      },
    });

    return PromosPersistenceMapper.toDomain(record);
  }

  async getAllPromos(): Promise<Promo[]> {
    const records = await this.prisma.promo.findMany({
      where: { deletedAt: null },
    });

    return records.map((record) => PromosPersistenceMapper.toDomain(record));
  }

  async getPromoById(id: string): Promise<Promo | null> {
    const record = await this.prisma.promo.findUnique({ where: { id } });

    return record ? PromosPersistenceMapper.toDomain(record) : null;
  }

  async getPromoByCode(code: string): Promise<Promo | null> {
    const record = await this.prisma.promo.findFirst({
      where: { code, deletedAt: null },
    });

    return record ? PromosPersistenceMapper.toDomain(record) : null;
  }

  async updatePromo(promo: Promo): Promise<Promo> {
    try {
      const record = await this.prisma.promo.update({
        where: { id: promo.id },
        data: {
          code: promo.code,
          type: PromosPersistenceMapper.toPersistenceType(promo.type),
          value: promo.value,
          expiration: promo.expiration,
          remainUsages: promo.remainUsages,
          minimumPurchaseAmount: promo.minimumPurchaseAmount,
          updatedAt: promo.updatedAt,
        },
      });

      return PromosPersistenceMapper.toDomain(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === RECORD_NOT_FOUND
      ) {
        throw new PromoNotFoundError(promo.id);
      }
      throw error;
    }
  }

  async deletePromo(promo: Promo): Promise<Promo> {
    try {
      const record = await this.prisma.promo.update({
        where: { id: promo.id },
        data: {
          updatedAt: promo.updatedAt,
          deletedAt: promo.deletedAt,
        },
      });

      return PromosPersistenceMapper.toDomain(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === RECORD_NOT_FOUND
      ) {
        throw new PromoNotFoundError(promo.id);
      }
      throw error;
    }
  }
}
