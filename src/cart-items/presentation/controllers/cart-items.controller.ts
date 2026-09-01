import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CheckPolicies } from '../../../authorization/decorators/check-policies.decorator';
import { JwtAuthGuard } from '../../../authorization/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../../authorization/guards/policies.guard';
import { ErrorResponseDto } from '../../../exceptions/dto/error-response.dto';
import { internalServerErrorExample } from '../../../exceptions/dto/error-response.example';
import { AddCartItemUseCase } from '../../application/use-cases/add-cart-item.use-case';
import { AddCartItemDto } from '../dto/add-cart-item';
import { CartItemResponseDto } from '../dto/cart-item-response';
import { CartItemResponseMapper } from '../mappers/cart-item-response.mapper';

@ApiTags('cart-items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PoliciesGuard)
@CheckPolicies(() => true)
@ApiUnauthorizedResponse({
  description: 'Missing, invalid, or expired access token',
  type: ErrorResponseDto,
  example: {
    error: 'Invalid or expired token',
    details: [],
  },
})
@Controller('cart-items')
export class CartItemsController {
  constructor(private readonly addCartItemUseCase: AddCartItemUseCase) {}

  @Post()
  @ApiOperation({
    summary: "Add a product variant to the authenticated user's cart",
  })
  @ApiCreatedResponse({
    description: 'Created cart item',
    type: CartItemResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    example: {
      error: 'Bad Request',
      details: ['productVariantId must be a UUID'],
    },
  })
  @ApiNotFoundResponse({
    description: 'Product variant or cart not found',
    type: ErrorResponseDto,
    examples: {
      ProductVariantNotFound: {
        summary: 'Product variant not found',
        value: { error: 'Product variant not found', details: [] },
      },
      CartNotFound: {
        summary: "Authenticated user's cart not found",
        value: { error: 'Cart not found', details: [] },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async addCartItem(
    @Req() req: Request,
    @Body() dto: AddCartItemDto,
  ): Promise<CartItemResponseDto> {
    const cartItem = await this.addCartItemUseCase.execute({
      userId: req.user!.sub,
      productVariantId: dto.productVariantId,
      quantity: dto.quantity,
    });
    return CartItemResponseMapper.toResponse(cartItem);
  }
}
