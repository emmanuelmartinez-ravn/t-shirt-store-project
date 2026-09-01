import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Action } from '../../../authorization/ability/action.enum';
import { CheckPolicies } from '../../../authorization/decorators/check-policies.decorator';
import { JwtAuthGuard } from '../../../authorization/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../../authorization/guards/policies.guard';
import { ApiPaginatedResponse } from '../../../common/pagination/decorators/api-paginated-response.decorator';
import { PaginatedResponse } from '../../../common/pagination/paginated-response';
import { PaginationMapper } from '../../../common/pagination/pagination.mapper';
import { PaginationQueryDto } from '../../../common/pagination/dto/pagination-query.dto';
import { ErrorResponseDto } from '../../../exceptions/dto/error-response.dto';
import { internalServerErrorExample } from '../../../exceptions/dto/error-response.example';
import { CreateProductVariantUseCase } from '../../application/use-cases/create-product-variant.use-case';
import { GetAllProductVariantsUseCase } from '../../application/use-cases/get-all-product-variants.use-case';
import { CreateProductVariantDto } from '../dto/product-variant-create';
import { ProductVariantResponseDto } from '../dto/product-variant-response';
import { ProductVariantResponseMapper } from '../mappers/product-variant-response.mapper';

const MANAGER_ONLY_UNAUTHORIZED_RESPONSE = {
  description: 'Missing, invalid, or expired access token',
  type: ErrorResponseDto,
  example: {
    error: 'Invalid or expired token',
    details: [],
  },
};

const MANAGER_ONLY_FORBIDDEN_RESPONSE = {
  description: 'Authenticated user is not a manager',
  type: ErrorResponseDto,
  example: {
    error: 'Insufficient permissions',
    details: [],
  },
};

@ApiTags('product-variants')
@Controller('product-variants')
export class ProductVariantsController {
  constructor(
    private readonly createProductVariantUseCase: CreateProductVariantUseCase,
    private readonly getAllProductVariantsUseCase: GetAllProductVariantsUseCase,
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Product'))
  @ApiOperation({ summary: 'Create a new product variant' })
  @ApiCreatedResponse({
    description: 'Created product variant',
    type: ProductVariantResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    examples: {
      InvalidProductId: {
        summary: 'productId is not a valid UUID',
        value: {
          error: 'Bad Request',
          details: ['productId must be a UUID'],
        },
      },
      InvalidAttributes: {
        summary: 'attributes contains a non-string or empty value',
        value: {
          error: 'Bad Request',
          details: [
            'attributes must be an object whose values are all non-empty strings',
          ],
        },
      },
    },
  })
  @ApiUnauthorizedResponse(MANAGER_ONLY_UNAUTHORIZED_RESPONSE)
  @ApiForbiddenResponse(MANAGER_ONLY_FORBIDDEN_RESPONSE)
  @ApiNotFoundResponse({
    description: 'Product not found',
    type: ErrorResponseDto,
    example: { error: 'Product not found', details: [] },
  })
  @ApiConflictResponse({
    description: 'Product variant already exists',
    type: ErrorResponseDto,
    example: {
      error: 'Product variant already exists',
      details: ['sku must be unique'],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async createProductVariant(
    @Body() dto: CreateProductVariantDto,
  ): Promise<ProductVariantResponseDto> {
    const variant = await this.createProductVariantUseCase.execute({
      productId: dto.productId,
      price: dto.price,
      stock: dto.stock,
      attributes: dto.attributes,
    });
    return ProductVariantResponseMapper.toResponse(variant);
  }

  @Get('product/:id')
  @ApiOperation({ summary: 'Get all variants of a product' })
  @ApiPaginatedResponse(
    ProductVariantResponseDto,
    'Paginated list of enabled, live (non-deleted) variants of the given product',
  )
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    example: {
      error: 'Validation failed (uuid is expected)',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async getAllProductVariants(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<ProductVariantResponseDto>> {
    const { items, total } = await this.getAllProductVariantsUseCase.execute({
      productId: id,
      page: query.page,
      limit: query.limit,
      disabled: false,
    });
    return {
      data: items.map((variant) =>
        ProductVariantResponseMapper.toResponse(variant),
      ),
      pagination: PaginationMapper.buildMeta(query.page, query.limit, total),
    };
  }

  @Get('product/:id/liked')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies(() => true)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get liked variants of a product',
  })
  @ApiPaginatedResponse(
    ProductVariantResponseDto,
    'Paginated list of liked variants of the given product',
  )
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    example: {
      error: 'Validation failed (uuid is expected)',
      details: [],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired access token',
    type: ErrorResponseDto,
    example: { error: 'Invalid or expired token', details: [] },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async getLikedProductVariants(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<ProductVariantResponseDto>> {
    const { items, total } = await this.getAllProductVariantsUseCase.execute({
      productId: id,
      page: query.page,
      limit: query.limit,
      disabled: false,
      liked: true,
      userId: req.user!.sub,
    });
    return {
      data: items.map((variant) =>
        ProductVariantResponseMapper.toResponse(variant),
      ),
      pagination: PaginationMapper.buildMeta(query.page, query.limit, total),
    };
  }

  @Get('product/:id/disabled')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies(() => true)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get disabled variants of a product' })
  @ApiPaginatedResponse(
    ProductVariantResponseDto,
    'Paginated list of disabled variants of the given product',
  )
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    example: {
      error: 'Validation failed (uuid is expected)',
      details: [],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired access token',
    type: ErrorResponseDto,
    example: { error: 'Invalid or expired token', details: [] },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async getDisabledProductVariants(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<ProductVariantResponseDto>> {
    const { items, total } = await this.getAllProductVariantsUseCase.execute({
      productId: id,
      page: query.page,
      limit: query.limit,
      disabled: true,
    });
    return {
      data: items.map((variant) =>
        ProductVariantResponseMapper.toResponse(variant),
      ),
      pagination: PaginationMapper.buildMeta(query.page, query.limit, total),
    };
  }
}
