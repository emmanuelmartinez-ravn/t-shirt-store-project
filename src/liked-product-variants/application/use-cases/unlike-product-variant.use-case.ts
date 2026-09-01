import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LikeNotFoundError } from '../../domain/errors/like-not-found';
import { LikedProductVariantRepository } from '../../infrastructure/repositories/liked-product-variant.repository';

@Injectable()
export class UnlikeProductVariantUseCase {
  private readonly logger: Logger = new Logger(
    UnlikeProductVariantUseCase.name,
  );

  constructor(
    private readonly likedProductVariantRepository: LikedProductVariantRepository,
  ) {}

  async execute(props: {
    userId: string;
    productVariantId: string;
  }): Promise<void> {
    try {
      const removed = await this.likedProductVariantRepository.unlike(
        props.userId,
        props.productVariantId,
      );

      if (!removed) {
        throw new LikeNotFoundError(props.userId, props.productVariantId);
      }

      this.logger.log(
        `User ${props.userId} unliked product variant ${props.productVariantId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to unlike product variant ${props.productVariantId} for user ${props.userId}`,
        error,
      );

      if (error instanceof LikeNotFoundError) {
        throw new NotFoundException({ error: 'Like not found', details: [] });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
