import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
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
import { UserResponseDto } from '../../../auth/presentation/dto/user-response';
import { UserResponseMapper } from '../../../auth/presentation/mappers/user-response.mapper';
import { ErrorResponseDto } from '../../../exceptions/dto/error-response.dto';
import { internalServerErrorExample } from '../../../exceptions/dto/error-response.example';
import { PromoteUserToManagerUseCase } from '../../application/use-cases/promote-user-to-manager.use-case';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PoliciesGuard)
@CheckPolicies((ability) => ability.can(Action.Manage, 'User'))
@ApiUnauthorizedResponse({
  description: 'Missing, invalid, or expired access token',
  type: ErrorResponseDto,
  example: {
    error: 'Invalid or expired token',
    details: [],
  },
})
@Controller('users')
export class UsersController {
  constructor(
    private readonly promoteUserToManagerUseCase: PromoteUserToManagerUseCase,
  ) {}

  @Post(':id/promotion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Promote a client user to manager' })
  @ApiOkResponse({
    description: 'Promoted user',
    type: UserResponseDto,
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
    description: 'User not found',
    type: ErrorResponseDto,
    example: {
      error: 'User not found',
      details: [],
    },
  })
  @ApiForbiddenResponse({
    description:
      'User is disabled, or the authenticated caller is not a manager',
    type: ErrorResponseDto,
    examples: {
      UserDisabled: {
        summary: 'Target user is disabled',
        value: {
          error: 'User is disabled',
          details: [],
        },
      },
      InsufficientPermissions: {
        summary: 'Authenticated user is not a manager',
        value: {
          error: 'Insufficient permissions',
          details: [],
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'User is already a manager, or is not currently a client',
    type: ErrorResponseDto,
    examples: {
      AlreadyManager: {
        summary: 'User is already a manager',
        value: {
          error: 'User is already a manager',
          details: [],
        },
      },
      NotClient: {
        summary: 'User does not currently have the client role',
        value: {
          error: 'User must be a client to be promoted',
          details: [],
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async promote(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    const user = await this.promoteUserToManagerUseCase.execute(id);
    return UserResponseMapper.toResponse(user);
  }
}
