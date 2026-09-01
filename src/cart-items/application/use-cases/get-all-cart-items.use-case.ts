import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/paginated-result';
import { CartItem } from '../../domain/models/cart-item';
import { CartItemRepository } from '../../infrastructure/repositories/cart-item.repository';

@Injectable()
export class GetAllCartItemsUseCase {
  private readonly logger: Logger = new Logger(GetAllCartItemsUseCase.name);

  constructor(private readonly cartItemRepository: CartItemRepository) {}

  async execute(params: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<PaginatedResult<CartItem>> {
    try {
      const result = await this.cartItemRepository.getAllCartItems(params);
      this.logger.log(
        `Retrieved ${result.items.length} cart items for user ${params.userId} (page ${params.page})`,
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to retrieve cart items', error);
      throw new InternalServerErrorException({
        error: 'Internal Server Error',
        details: [],
      });
    }
  }
}
