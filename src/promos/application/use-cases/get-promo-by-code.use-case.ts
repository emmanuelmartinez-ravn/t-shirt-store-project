import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PromoNotFoundError } from '../../domain/errors/promo-not-found';
import { Promo } from '../../domain/models/promo';
import { PromoRepository } from '../../infrastructure/repositories/promo.repository';

@Injectable()
export class GetPromoByCodeUseCase {
  private readonly logger: Logger = new Logger(GetPromoByCodeUseCase.name);

  constructor(private readonly promoRepository: PromoRepository) {}

  async execute(code: string): Promise<Promo> {
    try {
      const promo = await this.promoRepository.getPromoByCode(code);

      if (!promo) {
        throw new PromoNotFoundError(code);
      }

      this.logger.log(`Retrieved promo ${promo.code}`);
      return promo;
    } catch (error) {
      this.logger.error(`Failed to retrieve promo ${code}`, error);

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
