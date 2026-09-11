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
export class GetPromoByIdUseCase {
  private readonly logger: Logger = new Logger(GetPromoByIdUseCase.name);

  constructor(private readonly promoRepository: PromoRepository) {}

  async execute(id: string): Promise<Promo> {
    try {
      const promo = await this.promoRepository.getPromoById(id);

      if (!promo) {
        throw new PromoNotFoundError(id);
      }

      this.logger.log(`Retrieved promo ${promo.code}`);
      return promo;
    } catch (error) {
      this.logger.error(`Failed to retrieve promo ${id}`, error);

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
