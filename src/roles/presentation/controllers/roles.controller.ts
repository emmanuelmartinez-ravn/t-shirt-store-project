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
import { ErrorResponseDto } from '../../../exceptions/dto/error-response.dto';
import { internalServerErrorExample } from '../../../exceptions/dto/error-response.example';
import { Action } from '../../../authorization/ability/action.enum';
import { CheckPolicies } from '../../../authorization/decorators/check-policies.decorator';
import { JwtAuthGuard } from '../../../authorization/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../../authorization/guards/policies.guard';
import { CreateRoleUseCase } from '../../application/use-cases/create-role.use-case';
import { DeleteRoleUseCase } from '../../application/use-cases/delete-role.use-case';
import { GetAllRolesUseCase } from '../../application/use-cases/get-all-roles.use-case';
import { UpdateRoleUseCase } from '../../application/use-cases/update-role.use-case';
import { CreateRoleDto } from '../dto/role-create';
import { UpdateRoleDto } from '../dto/role-update';
import { RoleResponseDto } from '../dto/role-response';
import { RolesResponseMapper } from '../mappers/roles-response.mapper';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PoliciesGuard)
@CheckPolicies((ability) => ability.can(Action.Manage, 'Role'))
@ApiUnauthorizedResponse({
  description: 'Missing, invalid, or expired access token',
  type: ErrorResponseDto,
  example: {
    error: 'Invalid or expired token',
    details: [],
  },
})
@ApiForbiddenResponse({
  description: 'Authenticated user is not a manager',
  type: ErrorResponseDto,
  example: {
    error: 'Insufficient permissions',
    details: [],
  },
})
@Controller('roles')
export class RolesController {
  constructor(
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly getAllRolesUseCase: GetAllRolesUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new role' })
  @ApiCreatedResponse({
    description: 'Created role',
    type: RoleResponseDto,
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
  @ApiConflictResponse({
    description: 'Role already exists',
    type: ErrorResponseDto,
    example: {
      error: 'Role already exists',
      details: ['name must be unique'],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async createRole(
    @Body() dto: CreateRoleDto,
  ): Promise<RoleResponseDto> {
    const role = await this.createRoleUseCase.execute(dto.name);
    return RolesResponseMapper.toResponse(role);
  }

  @Get()
  @ApiOperation({ summary: 'Get all roles' })
  @ApiOkResponse({
    description: 'All roles',
    type: RoleResponseDto,
    isArray: true,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async getAllRoles(): Promise<RoleResponseDto[]> {
    const roles = await this.getAllRolesUseCase.execute();
    return roles.map((role) => RolesResponseMapper.toResponse(role));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a role' })
  @ApiOkResponse({
    description: 'Updated role',
    type: RoleResponseDto,
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
  @ApiNotFoundResponse({
    description: 'Role not found',
    type: ErrorResponseDto,
    example: {
      error: 'Role not found',
      details: [],
    },
  })
  @ApiConflictResponse({
    description: 'Role already exists',
    type: ErrorResponseDto,
    example: {
      error: 'Role already exists',
      details: ['name must be unique'],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    const role = await this.updateRoleUseCase.execute(id, dto.name);
    return RolesResponseMapper.toResponse(role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a role' })
  @ApiOkResponse({
    description: 'Soft-deleted role',
    type: RoleResponseDto,
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
    description: 'Role not found',
    type: ErrorResponseDto,
    example: {
      error: 'Role not found',
      details: [],
    },
  })
  @ApiGoneResponse({
    description: 'Role already deleted',
    type: ErrorResponseDto,
    example: {
      error: 'Role already deleted',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async deleteRole(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoleResponseDto> {
    const role = await this.deleteRoleUseCase.execute(id);
    return RolesResponseMapper.toResponse(role);
  }
}
