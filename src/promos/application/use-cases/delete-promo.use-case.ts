import {
  GoneException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PromoAlreadyDeletedError } from '../../domain/errors/promo-already-deleted';
import { PromoNotFoundError } from '../../domain/errors/promo-not-found';
import { Promo } from '../../domain/models/promo';
import { PromoRepository } from '../../infrastructure/repositories/promo.repository';

@Injectable()
export class DeletePromoUseCase {
  private readonly logger: Logger = new Logger(DeletePromoUseCase.name);

  constructor(private readonly promoRepository: PromoRepository) {}

  async execute(id: string): Promise<Promo> {
    try {
      const existingPromo = await this.promoRepository.getPromoById(id);

      if (!existingPromo) {
        throw new PromoNotFoundError(id);
      }

      if (existingPromo.deletedAt) {
        throw new PromoAlreadyDeletedError(id);
      }

      const deletedPromo = Promo.delete(existingPromo);
      const persistedPromo =
        await this.promoRepository.deletePromo(deletedPromo);
      this.logger.log(`Deleted promo ${persistedPromo.code}`);
      return persistedPromo;
    } catch (error) {
      this.logger.error(`Failed to delete promo ${id}`, error);

      if (error instanceof PromoNotFoundError) {
        throw new NotFoundException({
          error: 'Promo not found',
          details: [],
        });
      }

      if (error instanceof PromoAlreadyDeletedError) {
        throw new GoneException({
          error: 'Promo already deleted',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
