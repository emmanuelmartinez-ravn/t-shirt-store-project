import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
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
import { LikeProductVariantUseCase } from '../../application/use-cases/like-product-variant.use-case';
import { UnlikeProductVariantUseCase } from '../../application/use-cases/unlike-product-variant.use-case';
import { LikeProductVariantDto } from '../dto/like-product-variant';
import { LikedProductVariantResponseDto } from '../dto/liked-product-variant-response';
import { LikedProductVariantResponseMapper } from '../mappers/liked-product-variant-response.mapper';

@ApiTags('liked-product-variants')
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
@Controller('liked-product-variants')
export class LikedProductVariantsController {
  constructor(
    private readonly likeProductVariantUseCase: LikeProductVariantUseCase,
    private readonly unlikeProductVariantUseCase: UnlikeProductVariantUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Like a product variant' })
  @ApiCreatedResponse({
    description: 'Liked product variant',
    type: LikedProductVariantResponseDto,
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
    description: 'Product variant not found',
    type: ErrorResponseDto,
    example: { error: 'Product variant not found', details: [] },
  })
  @ApiConflictResponse({
    description: 'Product variant already liked',
    type: ErrorResponseDto,
    example: { error: 'Product variant already liked', details: [] },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async like(
    @Req() req: Request,
    @Body() dto: LikeProductVariantDto,
  ): Promise<LikedProductVariantResponseDto> {
    const liked = await this.likeProductVariantUseCase.execute({
      userId: req.user!.sub,
      productVariantId: dto.productVariantId,
    });
    return LikedProductVariantResponseMapper.toResponse(liked);
  }

  @Delete(':productVariantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlike a product variant' })
  @ApiNoContentResponse({ description: 'Unliked product variant' })
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    example: {
      error: 'Validation failed (uuid is expected)',
      details: [],
    },
  })
  @ApiNotFoundResponse({
    description: 'Like not found',
    type: ErrorResponseDto,
    example: { error: 'Like not found', details: [] },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async unlike(
    @Req() req: Request,
    @Param('productVariantId', ParseUUIDPipe) productVariantId: string,
  ): Promise<void> {
    await this.unlikeProductVariantUseCase.execute({
      userId: req.user!.sub,
      productVariantId,
    });
  }
}
