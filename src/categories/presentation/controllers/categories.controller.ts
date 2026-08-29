import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { ErrorResponseDto } from '../../../exceptions/dto/error-response.dto';
import { internalServerErrorExample } from '../../../exceptions/dto/error-response.example';
import { CreateCategoryUseCase } from '../../application/use-cases/create-category.use-case';
import { DeleteCategoryUseCase } from '../../application/use-cases/delete-category.use-case';
import { GetAllCategoriesUseCase } from '../../application/use-cases/get-all-categories.use-case';
import { GetCategoryByIdUseCase } from '../../application/use-cases/get-category-by-id.use-case';
import { UpdateCategoryUseCase } from '../../application/use-cases/update-category.use-case';
import { CreateCategoryDto } from '../dto/category-create';
import { UpdateCategoryDto } from '../dto/category-update';
import { CategoryResponseDto } from '../dto/category-response';
import { CategoriesResponseMapper } from '../mappers/categories-response.mapper';

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

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly getAllCategoriesUseCase: GetAllCategoriesUseCase,
    private readonly getCategoryByIdUseCase: GetCategoryByIdUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Category'))
  @ApiOperation({ summary: 'Create a new category' })
  @ApiCreatedResponse({
    description: 'Created category',
    type: CategoryResponseDto,
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
      InvalidNameType: {
        summary: 'name is not a string',
        value: {
          error: 'Bad Request',
          details: ['name must be a string'],
        },
      },
    },
  })
  @ApiUnauthorizedResponse(MANAGER_ONLY_UNAUTHORIZED_RESPONSE)
  @ApiForbiddenResponse(MANAGER_ONLY_FORBIDDEN_RESPONSE)
  @ApiConflictResponse({
    description: 'Category already exists',
    type: ErrorResponseDto,
    example: {
      error: 'Category already exists',
      details: ['name must be unique'],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async createCategory(
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.createCategoryUseCase.execute(dto.name);
    return CategoriesResponseMapper.toResponse(category);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiOkResponse({
    description: 'All live (non-deleted) categories',
    type: CategoryResponseDto,
    isArray: true,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async getAllCategories(): Promise<CategoryResponseDto[]> {
    const categories = await this.getAllCategoriesUseCase.execute();
    return categories.map((category) =>
      CategoriesResponseMapper.toResponse(category),
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a category by id',
  })
  @ApiOkResponse({
    description: 'Category, whether live or soft-deleted',
    type: CategoryResponseDto,
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
    description: 'Category not found',
    type: ErrorResponseDto,
    example: {
      error: 'Category not found',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async getCategoryById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.getCategoryByIdUseCase.execute(id);
    return CategoriesResponseMapper.toResponse(category);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Category'))
  @ApiOperation({ summary: 'Update a category' })
  @ApiOkResponse({
    description: 'Updated category',
    type: CategoryResponseDto,
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
    description: 'Category not found',
    type: ErrorResponseDto,
    example: {
      error: 'Category not found',
      details: [],
    },
  })
  @ApiConflictResponse({
    description: 'Category already exists',
    type: ErrorResponseDto,
    example: {
      error: 'Category already exists',
      details: ['name must be unique'],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.updateCategoryUseCase.execute(id, dto.name);
    return CategoriesResponseMapper.toResponse(category);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Category'))
  @ApiOperation({ summary: 'Soft-delete a category' })
  @ApiOkResponse({
    description: 'Soft-deleted category',
    type: CategoryResponseDto,
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
    description: 'Category not found',
    type: ErrorResponseDto,
    example: {
      error: 'Category not found',
      details: [],
    },
  })
  @ApiGoneResponse({
    description: 'Category already deleted',
    type: ErrorResponseDto,
    example: {
      error: 'Category already deleted',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async deleteCategory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.deleteCategoryUseCase.execute(id);
    return CategoriesResponseMapper.toResponse(category);
  }
}
