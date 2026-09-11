import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PromoNotFoundError } from '../../domain/errors/promo-not-found';
import { Promo, PromoDiscountType } from '../../domain/models/promo';
import { PromoRepository } from '../../infrastructure/repositories/promo.repository';

@Injectable()
export class UpdatePromoUseCase {
  private readonly logger: Logger = new Logger(UpdatePromoUseCase.name);

  constructor(private readonly promoRepository: PromoRepository) {}

  async execute(
    id: string,
    props: {
      code: string;
      type: PromoDiscountType;
      value: number;
      expiration: Date | null;
      remainUsages: number | null;
      minimumPurchaseAmount: number | null;
    },
  ): Promise<Promo> {
    try {
      const existingPromo = await this.promoRepository.getPromoById(id);

      if (!existingPromo) {
        throw new PromoNotFoundError(id);
      }

      const updatedPromo = Promo.update(existingPromo, props);
      const persistedPromo =
        await this.promoRepository.updatePromo(updatedPromo);
      this.logger.log(`Updated promo ${persistedPromo.code}`);
      return persistedPromo;
    } catch (error) {
      this.logger.error(`Failed to update promo ${id}`, error);

      if (error instanceof PromoNotFoundError) {
        throw new NotFoundException({
          error: 'Promo not found',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
