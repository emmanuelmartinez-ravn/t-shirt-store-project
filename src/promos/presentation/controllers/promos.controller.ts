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
import { CreatePromoUseCase } from '../../application/use-cases/create-promo.use-case';
import { DeletePromoUseCase } from '../../application/use-cases/delete-promo.use-case';
import { GetAllPromosUseCase } from '../../application/use-cases/get-all-promos.use-case';
import { GetPromoByCodeUseCase } from '../../application/use-cases/get-promo-by-code.use-case';
import { GetPromoByIdUseCase } from '../../application/use-cases/get-promo-by-id.use-case';
import { UpdatePromoUseCase } from '../../application/use-cases/update-promo.use-case';
import { CreatePromoDto } from '../dto/promo-create';
import { PromoResponseDto } from '../dto/promo-response';
import { UpdatePromoDto } from '../dto/promo-update';
import { PromosResponseMapper } from '../mappers/promos-response.mapper';

const UNAUTHORIZED_RESPONSE = {
  description: 'Missing, invalid, or expired access token',
  type: ErrorResponseDto,
  example: {
    error: 'Invalid or expired token',
    details: [],
  },
};

const FORBIDDEN_RESPONSE = {
  description: 'Authenticated user lacks permission for this action',
  type: ErrorResponseDto,
  example: {
    error: 'Insufficient permissions',
    details: [],
  },
};

@ApiTags('promos')
@Controller('promos')
export class PromosController {
  constructor(
    private readonly createPromoUseCase: CreatePromoUseCase,
    private readonly getAllPromosUseCase: GetAllPromosUseCase,
    private readonly getPromoByIdUseCase: GetPromoByIdUseCase,
    private readonly getPromoByCodeUseCase: GetPromoByCodeUseCase,
    private readonly updatePromoUseCase: UpdatePromoUseCase,
    private readonly deletePromoUseCase: DeletePromoUseCase,
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Create, 'Promo'))
  @ApiOperation({ summary: 'Create a new promo' })
  @ApiCreatedResponse({
    description: 'Created promo',
    type: PromoResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    examples: {
      MissingCode: {
        summary: 'code is missing',
        value: {
          error: 'Bad Request',
          details: ['code should not be empty'],
        },
      },
      InvalidType: {
        summary: 'type is not a valid discount type',
        value: {
          error: 'Bad Request',
          details: [
            'type must be one of the following values: percentage, fixed',
          ],
        },
      },
    },
  })
  @ApiUnauthorizedResponse(UNAUTHORIZED_RESPONSE)
  @ApiForbiddenResponse(FORBIDDEN_RESPONSE)
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async createPromo(
    @Body() dto: CreatePromoDto,
  ): Promise<PromoResponseDto> {
    const promo = await this.createPromoUseCase.execute({
      code: dto.code,
      type: dto.type,
      value: dto.value,
      expiration: dto.expiration ? new Date(dto.expiration) : null,
      remainUsages: dto.remainUsages ?? null,
      minimumPurchaseAmount: dto.minimumPurchaseAmount ?? null,
    });
    return PromosResponseMapper.toResponse(promo);
  }

  @Get()
  @ApiOperation({ summary: 'Get all promos' })
  @ApiOkResponse({
    description: 'All live (non-deleted) promos',
    type: PromoResponseDto,
    isArray: true,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async getAllPromos(): Promise<PromoResponseDto[]> {
    const promos = await this.getAllPromosUseCase.execute();
    return promos.map((promo) => PromosResponseMapper.toResponse(promo));
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get a promo by code' })
  @ApiOkResponse({
    description: 'Live promo matching the given code',
    type: PromoResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Promo not found',
    type: ErrorResponseDto,
    example: {
      error: 'Promo not found',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async getPromoByCode(
    @Param('code') code: string,
  ): Promise<PromoResponseDto> {
    const promo = await this.getPromoByCodeUseCase.execute(code);
    return PromosResponseMapper.toResponse(promo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a promo by id' })
  @ApiOkResponse({
    description: 'Promo, whether live or soft-deleted',
    type: PromoResponseDto,
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
    description: 'Promo not found',
    type: ErrorResponseDto,
    example: {
      error: 'Promo not found',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async getPromoById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PromoResponseDto> {
    const promo = await this.getPromoByIdUseCase.execute(id);
    return PromosResponseMapper.toResponse(promo);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Update, 'Promo'))
  @ApiOperation({ summary: 'Update a promo' })
  @ApiOkResponse({
    description: 'Updated promo',
    type: PromoResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    examples: {
      MissingCode: {
        summary: 'code is missing',
        value: {
          error: 'Bad Request',
          details: ['code should not be empty'],
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
  @ApiUnauthorizedResponse(UNAUTHORIZED_RESPONSE)
  @ApiForbiddenResponse(FORBIDDEN_RESPONSE)
  @ApiNotFoundResponse({
    description: 'Promo not found',
    type: ErrorResponseDto,
    example: {
      error: 'Promo not found',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async updatePromo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromoDto,
  ): Promise<PromoResponseDto> {
    const promo = await this.updatePromoUseCase.execute(id, {
      code: dto.code,
      type: dto.type,
      value: dto.value,
      expiration: dto.expiration ? new Date(dto.expiration) : null,
      remainUsages: dto.remainUsages ?? null,
      minimumPurchaseAmount: dto.minimumPurchaseAmount ?? null,
    });
    return PromosResponseMapper.toResponse(promo);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Delete, 'Promo'))
  @ApiOperation({ summary: 'Soft-delete a promo' })
  @ApiOkResponse({
    description: 'Soft-deleted promo',
    type: PromoResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    example: {
      error: 'Validation failed (uuid is expected)',
      details: [],
    },
  })
  @ApiUnauthorizedResponse(UNAUTHORIZED_RESPONSE)
  @ApiForbiddenResponse(FORBIDDEN_RESPONSE)
  @ApiNotFoundResponse({
    description: 'Promo not found',
    type: ErrorResponseDto,
    example: {
      error: 'Promo not found',
      details: [],
    },
  })
  @ApiGoneResponse({
    description: 'Promo already deleted',
    type: ErrorResponseDto,
    example: {
      error: 'Promo already deleted',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async deletePromo(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PromoResponseDto> {
    const promo = await this.deletePromoUseCase.execute(id);
    return PromosResponseMapper.toResponse(promo);
  }
}
