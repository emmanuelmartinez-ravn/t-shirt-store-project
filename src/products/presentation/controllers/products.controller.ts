import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Action } from '../../../authorization/ability/action.enum';
import { CheckPolicies } from '../../../authorization/decorators/check-policies.decorator';
import { JwtAuthGuard } from '../../../authorization/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../../authorization/guards/policies.guard';
import { ApiPaginatedResponse } from '../../../common/pagination/decorators/api-paginated-response.decorator';
import { PaginatedResponse } from '../../../common/pagination/paginated-response';
import { PaginationMapper } from '../../../common/pagination/pagination.mapper';
import { ErrorResponseDto } from '../../../exceptions/dto/error-response.dto';
import { internalServerErrorExample } from '../../../exceptions/dto/error-response.example';
import { CreateProductUseCase } from '../../application/use-cases/create-product.use-case';
import { DeleteProductImageUseCase } from '../../application/use-cases/delete-product-image.use-case';
import { DeleteProductUseCase } from '../../application/use-cases/delete-product.use-case';
import { GetAllProductsUseCase } from '../../application/use-cases/get-all-products.use-case';
import { GetProductByIdUseCase } from '../../application/use-cases/get-product-by-id.use-case';
import { ToggleProductDisabledUseCase } from '../../application/use-cases/toggle-product-disabled.use-case';
import { UpdateProductUseCase } from '../../application/use-cases/update-product.use-case';
import { UploadProductImagesUseCase } from '../../application/use-cases/upload-product-images.use-case';
import { CreateProductDto } from '../dto/product-create';
import { UpdateProductDto } from '../dto/product-update';
import { ProductImagesResponseDto } from '../dto/product-images-response';
import { ProductResponseDto } from '../dto/product-response';
import { ProductsQueryDto } from '../dto/products-query';
import { ProductsResponseMapper } from '../mappers/products-response.mapper';
import {
  PRODUCT_IMAGES_FIELD,
  ProductImagesInterceptor,
} from '../interceptors/product-images.interceptor';

const DEFAULT_PRODUCT_IMAGE_PATH = 'static/product_default.png';

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
    private readonly toggleProductDisabledUseCase: ToggleProductDisabledUseCase,
    private readonly uploadProductImagesUseCase: UploadProductImagesUseCase,
    private readonly deleteProductImageUseCase: DeleteProductImageUseCase,
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Create, 'Product'))
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
    'Paginated list of enabled, live (non-deleted) products, optionally filtered by name and categoryId',
  )
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async getAllProducts(
    @Req() req: Request,
    @Query() query: ProductsQueryDto,
  ): Promise<PaginatedResponse<ProductResponseDto>> {
    const { items, total } = await this.getAllProductsUseCase.execute(
      {
        page: query.page,
        limit: query.limit,
        name: query.name,
        categoryId: query.categoryId,
        disabled: false,
        fields: query.fields,
      },
      this.buildDefaultImageUrl(req),
    );
    return {
      data: items.map(({ product, images }) =>
        ProductsResponseMapper.toResponse(product, images),
      ),
      pagination: PaginationMapper.buildMeta(query.page, query.limit, total),
    };
  }

  @Get('liked')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies(() => true)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get liked products',
  })
  @ApiPaginatedResponse(
    ProductResponseDto,
    'Paginated list of liked products, optionally filtered by name and categoryId',
  )
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
  public async getLikedProducts(
    @Req() req: Request,
    @Query() query: ProductsQueryDto,
  ): Promise<PaginatedResponse<ProductResponseDto>> {
    const { items, total } = await this.getAllProductsUseCase.execute(
      {
        page: query.page,
        limit: query.limit,
        name: query.name,
        categoryId: query.categoryId,
        disabled: false,
        liked: true,
        userId: req.user!.sub,
        fields: query.fields,
      },
      this.buildDefaultImageUrl(req),
    );
    return {
      data: items.map(({ product, images }) =>
        ProductsResponseMapper.toResponse(product, images),
      ),
      pagination: PaginationMapper.buildMeta(query.page, query.limit, total),
    };
  }

  @Get('disabled')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies(() => true)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get disabled products' })
  @ApiPaginatedResponse(
    ProductResponseDto,
    'Paginated list of disabled products, optionally filtered by name and categoryId',
  )
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
  public async getDisabledProducts(
    @Req() req: Request,
    @Query() query: ProductsQueryDto,
  ): Promise<PaginatedResponse<ProductResponseDto>> {
    const { items, total } = await this.getAllProductsUseCase.execute(
      {
        page: query.page,
        limit: query.limit,
        name: query.name,
        categoryId: query.categoryId,
        disabled: true,
        fields: query.fields,
      },
      this.buildDefaultImageUrl(req),
    );
    return {
      data: items.map(({ product, images }) =>
        ProductsResponseMapper.toResponse(product, images),
      ),
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
    @Req() req: Request,
  ): Promise<ProductResponseDto> {
    const { product, images } = await this.getProductByIdUseCase.execute(
      id,
      this.buildDefaultImageUrl(req),
    );
    return ProductsResponseMapper.toResponse(product, images);
  }

  @Post(':id/images')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Update, 'Product'))
  @UseInterceptors(ProductImagesInterceptor)
  @ApiOperation({
    summary: 'Upload images for a product',
    description:
      'Accepts 1 to 10 PNG or JPEG files in the images field, each up to 5 MB ' +
      'and at most 1024x1024 (any aspect ratio). A product can have at most 10 ' +
      'images in total. Images keep their format, are re-oriented per EXIF and ' +
      "stripped of metadata, and stored privately; the response contains the product's " +
      'full current image list with time-limited presigned URLs.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [PRODUCT_IMAGES_FIELD],
      properties: {
        [PRODUCT_IMAGES_FIELD]: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description:
            '1 to 10 PNG or JPEG images, each <= 5 MB and at most 1024x1024',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "The product's full current image list",
    type: ProductImagesResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid id, no files, too many images, or an image exceeds 1024x1024',
    type: ErrorResponseDto,
    examples: {
      InvalidId: {
        summary: 'id is not a valid UUID',
        value: {
          error: 'Validation failed (uuid is expected)',
          details: [],
        },
      },
      ImagesRequired: {
        summary: 'No file was sent in the images field',
        value: {
          error: 'At least one image file is required',
          details: [],
        },
      },
      TooManyFilesInRequest: {
        summary: 'More than 10 files were sent in one request',
        value: {
          error: 'A product can have at most 10 images',
          details: ['Received more than 10 files'],
        },
      },
      ImageLimitExceeded: {
        summary: 'Existing plus new images would exceed 10',
        value: {
          error: 'A product can have at most 10 images',
          details: ['Product has 8 images, tried to add 3'],
        },
      },
      DimensionsTooLarge: {
        summary: 'An image is larger than 1024x1024',
        value: {
          error: 'Image dimensions must not exceed 1024x1024',
          details: ['front.png: received 1200x800'],
        },
      },
    },
  })
  @ApiUnauthorizedResponse(MANAGER_ONLY_UNAUTHORIZED_RESPONSE)
  @ApiForbiddenResponse(MANAGER_ONLY_FORBIDDEN_RESPONSE)
  @ApiNotFoundResponse({
    description: 'Product not found or deleted',
    type: ErrorResponseDto,
    example: {
      error: 'Product not found',
      details: [],
    },
  })
  @ApiPayloadTooLargeResponse({
    description: 'An image file exceeds 5 MB',
    type: ErrorResponseDto,
    example: {
      error: 'Each image must be 5 MB or smaller',
      details: [],
    },
  })
  @ApiUnsupportedMediaTypeResponse({
    description: 'An image is not a readable PNG or JPEG',
    type: ErrorResponseDto,
    example: {
      error: 'Unsupported image format',
      details: ['front.gif: accepted formats are png, jpg, jpeg'],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error, e.g. the storage upload failed',
    type: ErrorResponseDto,
    examples: {
      UploadFailed: {
        summary: 'Images could not be stored or saved',
        value: {
          error: 'Failed to upload product images',
          details: [],
        },
      },
    },
  })
  public async uploadImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ): Promise<ProductImagesResponseDto> {
    const { images } = await this.uploadProductImagesUseCase.execute(
      id,
      files?.map((file) => ({
        buffer: file.buffer,
        size: file.size,
        originalname: file.originalname,
      })),
    );
    return {
      images: images.map((image) =>
        ProductsResponseMapper.toImageResponse(image),
      ),
    };
  }

  @Delete('images/:imageId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Update, 'Product'))
  @ApiOperation({
    summary: 'Delete a product image',
    description:
      'Soft-deletes a single product image by its id and removes the stored ' +
      "file. The response contains the product's remaining images with " +
      'time-limited presigned URLs, or the default image if none remain.',
  })
  @ApiOkResponse({
    description:
      "The product's remaining images, or the default image if none remain",
    type: ProductImagesResponseDto,
    examples: {
      RemainingImages: {
        summary: 'The product still has images',
        value: {
          images: [
            {
              id: '6f1c2b8e-4a5d-4e3f-9b7a-1c2d3e4f5a6b',
              url: 'https://bucket.s3.amazonaws.com/products/3f2a.../6f1c....png?X-Amz-Signature=...',
              expiresIn: 3600,
              isDefault: false,
            },
          ],
        },
      },
      DefaultOnly: {
        summary: 'The deleted image was the last one',
        value: {
          images: [
            {
              id: null,
              url: 'http://localhost:3000/static/product_default.png',
              expiresIn: null,
              isDefault: true,
            },
          ],
        },
      },
    },
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
    description: 'Image not found, already deleted, or its product was deleted',
    type: ErrorResponseDto,
    example: {
      error: 'Product image not found',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: {
      DeleteFailed: {
        summary: 'The image could not be deleted or the image list built',
        value: {
          error: 'Failed to delete product image',
          details: [],
        },
      },
    },
  })
  public async deleteImage(
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Req() req: Request,
  ): Promise<ProductImagesResponseDto> {
    const { images } = await this.deleteProductImageUseCase.execute(
      imageId,
      this.buildDefaultImageUrl(req),
    );
    return {
      images: images.map((image) =>
        ProductsResponseMapper.toImageResponse(image),
      ),
    };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Update, 'Product'))
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
  @CheckPolicies((ability) => ability.can(Action.Delete, 'Product'))
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

  @Patch(':id/disabled')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Update, 'Product'))
  @ApiOperation({ summary: "Toggle a product's disabled status" })
  @ApiOkResponse({
    description: 'Updated product',
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
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async toggleDisabled(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductResponseDto> {
    const product = await this.toggleProductDisabledUseCase.execute(id);
    return ProductsResponseMapper.toResponse(product);
  }

  private buildDefaultImageUrl(req: Request): string {
    return `${req.protocol}://${req.get('host')}/${DEFAULT_PRODUCT_IMAGE_PATH}`;
  }
}
