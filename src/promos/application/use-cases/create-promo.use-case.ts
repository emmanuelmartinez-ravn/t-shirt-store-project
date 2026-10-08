import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Promo, PromoDiscountType } from '../../domain/models/promo';
import { PromoRepository } from '../../infrastructure/repositories/promo.repository';

@Injectable()
export class CreatePromoUseCase {
  private readonly logger: Logger = new Logger(CreatePromoUseCase.name);

  constructor(private readonly promoRepository: PromoRepository) {}

  async execute(props: {
    code: string;
    type: PromoDiscountType;
    value: number;
    expiration: Date | null;
    remainUsages: number | null;
    minimumPurchaseAmount: number | null;
  }): Promise<Promo> {
    try {
      const promo = Promo.create(props);
      const createdPromo = await this.promoRepository.createPromo(promo);
      this.logger.log(`Created promo ${createdPromo.code}`);
      return createdPromo;
    } catch (error) {
      this.logger.error(`Failed to create promo ${props.code}`, error);

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
