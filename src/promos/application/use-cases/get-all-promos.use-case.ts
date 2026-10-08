import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Promo } from '../../domain/models/promo';
import { PromoRepository } from '../../infrastructure/repositories/promo.repository';

@Injectable()
export class GetAllPromosUseCase {
  private readonly logger: Logger = new Logger(GetAllPromosUseCase.name);

  constructor(private readonly promoRepository: PromoRepository) {}

  async execute(): Promise<Promo[]> {
    try {
      const promos = await this.promoRepository.getAllPromos();
      this.logger.log(`Retrieved ${promos.length} promos`);
      return promos;
    } catch (error) {
      this.logger.error('Failed to retrieve promos', error);
      throw new InternalServerErrorException({
        error: 'Internal Server Error',
        details: [],
      });
    }
  }
}
