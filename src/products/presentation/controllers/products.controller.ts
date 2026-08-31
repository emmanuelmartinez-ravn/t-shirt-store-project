import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Action } from '../../../authorization/ability/action.enum';
import { CheckPolicies } from '../../../authorization/decorators/check-policies.decorator';
import { JwtAuthGuard } from '../../../authorization/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../../authorization/guards/policies.guard';
import { ApiPaginatedResponse } from '../../../common/pagination/decorators/api-paginated-response.decorator';
import { PaginationQueryDto } from '../../../common/pagination/dto/pagination-query.dto';
import { PaginatedResponse } from '../../../common/pagination/paginated-response';
import { PaginationMapper } from '../../../common/pagination/pagination.mapper';
import { ErrorResponseDto } from '../../../exceptions/dto/error-response.dto';
import { internalServerErrorExample } from '../../../exceptions/dto/error-response.example';
import { CreateProductUseCase } from '../../application/use-cases/create-product.use-case';
import { DeleteProductUseCase } from '../../application/use-cases/delete-product.use-case';
import { GetAllProductsUseCase } from '../../application/use-cases/get-all-products.use-case';
import { GetProductByIdUseCase } from '../../application/use-cases/get-product-by-id.use-case';
import { UpdateProductUseCase } from '../../application/use-cases/update-product.use-case';
import { CreateProductDto } from '../dto/product-create';
import { UpdateProductDto } from '../dto/product-update';
import { ProductResponseDto } from '../dto/product-response';
import { ProductsResponseMapper } from '../mappers/products-response.mapper';

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

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly getAllProductsUseCase: GetAllProductsUseCase,
    private readonly getProductByIdUseCase: GetProductByIdUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Product'))
  @ApiOperation({ summary: 'Create a new product' })
  @ApiCreatedResponse({
    description: 'Created product',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    examples: {
      MissingName: {
        summary: 'name is missing',
        value: {
          error: 'Bad Request',
          details: ['name should not be empty'],
        },
      },
      InvalidCategoryId: {
        summary: 'categoryId is not a valid UUID',
        value: {
          error: 'Bad Request',
          details: ['categoryId must be a UUID'],
        },
      },
    },
  })
  @ApiUnauthorizedResponse(MANAGER_ONLY_UNAUTHORIZED_RESPONSE)
  @ApiForbiddenResponse(MANAGER_ONLY_FORBIDDEN_RESPONSE)
  @ApiNotFoundResponse({
    description: 'Category not found',
    type: ErrorResponseDto,
    example: {
      error: 'Category not found',
      details: [],
    },
  })
  @ApiConflictResponse({
    description: 'Product already exists',
    type: ErrorResponseDto,
    example: {
      error: 'Product already exists',
      details: ['name must be unique'],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async createProduct(
    @Body() dto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.createProductUseCase.execute({
      name: dto.name,
      description: dto.description ?? null,
      categoryId: dto.categoryId,
    });
    return ProductsResponseMapper.toResponse(product);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiPaginatedResponse(
    ProductResponseDto,
    'Paginated list of live (non-deleted) products',
  )
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async getAllProducts(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<ProductResponseDto>> {
    const { items, total } = await this.getAllProductsUseCase.execute({
      page: query.page,
      limit: query.limit,
    });
    return {
      data: items.map((product) => ProductsResponseMapper.toResponse(product)),
      pagination: PaginationMapper.buildMeta(query.page, query.limit, total),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by id' })
  @ApiOkResponse({
    description: 'Product',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    example: {
      error: 'Validation failed (uuid is expected)',
      details: [],
    },
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
    type: ErrorResponseDto,
    example: {
      error: 'Product not found',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async getProductById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductResponseDto> {
    const product = await this.getProductByIdUseCase.execute(id);
    return ProductsResponseMapper.toResponse(product);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Product'))
  @ApiOperation({ summary: 'Update a product' })
  @ApiOkResponse({
    description: 'Updated product',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    examples: {
      MissingName: {
        summary: 'name is missing',
        value: {
          error: 'Bad Request',
          details: ['name should not be empty'],
        },
      },
      InvalidId: {
        summary: 'id is not a valid UUID',
        value: {
          error: 'Validation failed (uuid is expected)',
          details: [],
        },
      },
    },
  })
  @ApiUnauthorizedResponse(MANAGER_ONLY_UNAUTHORIZED_RESPONSE)
  @ApiForbiddenResponse(MANAGER_ONLY_FORBIDDEN_RESPONSE)
  @ApiNotFoundResponse({
    description: 'Product or category not found',
    type: ErrorResponseDto,
    examples: {
      ProductNotFound: {
        summary: 'Product not found',
        value: {
          error: 'Product not found',
          details: [],
        },
      },
      CategoryNotFound: {
        summary: 'Referenced category not found',
        value: {
          error: 'Category not found',
          details: [],
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Product already exists',
    type: ErrorResponseDto,
    example: {
      error: 'Product already exists',
      details: ['name must be unique'],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.updateProductUseCase.execute(id, {
      name: dto.name,
      description: dto.description ?? null,
      categoryId: dto.categoryId,
    });
    return ProductsResponseMapper.toResponse(product);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Product'))
  @ApiOperation({ summary: 'Soft-delete a product' })
  @ApiOkResponse({
    description: 'Soft-deleted product',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    example: {
      error: 'Validation failed (uuid is expected)',
      details: [],
    },
  })
  @ApiUnauthorizedResponse(MANAGER_ONLY_UNAUTHORIZED_RESPONSE)
  @ApiForbiddenResponse(MANAGER_ONLY_FORBIDDEN_RESPONSE)
  @ApiNotFoundResponse({
    description: 'Product not found',
    type: ErrorResponseDto,
    example: {
      error: 'Product not found',
      details: [],
    },
  })
  @ApiGoneResponse({
    description: 'Product already deleted',
    type: ErrorResponseDto,
    example: {
      error: 'Product already deleted',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async deleteProduct(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductResponseDto> {
    const product = await this.deleteProductUseCase.execute(id);
    return ProductsResponseMapper.toResponse(product);
  }
}
