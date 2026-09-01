import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Action } from '../../../authorization/ability/action.enum';
import { CheckPolicies } from '../../../authorization/decorators/check-policies.decorator';
import { JwtAuthGuard } from '../../../authorization/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../../authorization/guards/policies.guard';
import { UserResponseDto } from '../../../auth/presentation/dto/user-response';
import { UserResponseMapper } from '../../../auth/presentation/mappers/user-response.mapper';
import { ErrorResponseDto } from '../../../exceptions/dto/error-response.dto';
import { internalServerErrorExample } from '../../../exceptions/dto/error-response.example';
import { AnonymizeUserUseCase } from '../../application/use-cases/anonymize-user.use-case';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case';
import { PromoteUserToManagerUseCase } from '../../application/use-cases/promote-user-to-manager.use-case';
import { ToggleUserDisabledUseCase } from '../../application/use-cases/toggle-user-disabled.use-case';
import { UpdatePasswordUseCase } from '../../application/use-cases/update-password.use-case';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case';
import { UpdatePasswordDto } from '../dto/update-password';
import { UpdateProfileDto } from '../dto/update-profile';

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
    private readonly toggleUserDisabledUseCase: ToggleUserDisabledUseCase,
    private readonly updatePasswordUseCase: UpdatePasswordUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly anonymizeUserUseCase: AnonymizeUserUseCase,
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

  @Patch(':id/disabled')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Toggle a user's disabled status" })
  @ApiOkResponse({
    description: 'Updated user',
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
    description: 'The authenticated caller is not a manager',
    type: ErrorResponseDto,
    example: {
      error: 'Insufficient permissions',
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
  ): Promise<UserResponseDto> {
    const user = await this.toggleUserDisabledUseCase.execute(id);
    return UserResponseMapper.toResponse(user);
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  @CheckPolicies(() => true)
  @ApiOperation({ summary: "Change the authenticated user's password" })
  @ApiOkResponse({
    description: 'Updated user',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request, or the old password is incorrect',
    type: ErrorResponseDto,
    examples: {
      WeakPassword: {
        summary: 'newPassword does not meet complexity requirements',
        value: {
          error: 'Bad Request',
          details: [
            'newPassword must be at least 8 characters long',
            'newPassword must contain at least one uppercase letter',
          ],
        },
      },
      ConfirmMismatch: {
        summary: 'confirmPassword does not match newPassword',
        value: {
          error: 'Bad Request',
          details: ['confirmPassword must match newPassword'],
        },
      },
      IncorrectOldPassword: {
        summary: 'oldPassword does not match the current password',
        value: {
          error: 'Old password is incorrect',
          details: [],
        },
      },
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
    description: 'Authenticated user is disabled',
    type: ErrorResponseDto,
    example: {
      error: 'User is disabled',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async updatePassword(
    @Req() req: Request,
    @Body() dto: UpdatePasswordDto,
  ): Promise<UserResponseDto> {
    const user = await this.updatePasswordUseCase.execute(req.user!.sub, {
      oldPassword: dto.oldPassword,
      newPassword: dto.newPassword,
    });
    return UserResponseMapper.toResponse(user);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @CheckPolicies(() => true)
  @ApiOperation({ summary: "Update the authenticated user's name" })
  @ApiOkResponse({
    description: 'Updated user',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    example: {
      error: 'Bad Request',
      details: ['firstName should not be empty'],
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
    description: 'Authenticated user is disabled',
    type: ErrorResponseDto,
    example: {
      error: 'User is disabled',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async updateProfile(
    @Req() req: Request,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.updateProfileUseCase.execute(req.user!.sub, {
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
    return UserResponseMapper.toResponse(user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a user' })
  @ApiOkResponse({
    description: 'Soft-deleted user',
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
  @ApiGoneResponse({
    description: 'User already deleted',
    type: ErrorResponseDto,
    example: {
      error: 'User already deleted',
      details: [],
    },
  })
  @ApiForbiddenResponse({
    description: 'The authenticated caller is not a manager',
    type: ErrorResponseDto,
    example: {
      error: 'Insufficient permissions',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    const user = await this.deleteUserUseCase.execute(id);
    return UserResponseMapper.toResponse(user);
  }

  @Patch(':id/anonymize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Anonymize a deleted user's data" })
  @ApiOkResponse({
    description: 'Anonymized user',
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
  @ApiConflictResponse({
    description: 'User must be deleted before it can be anonymized',
    type: ErrorResponseDto,
    example: {
      error: 'User must be deleted before it can be anonymized',
      details: [],
    },
  })
  @ApiForbiddenResponse({
    description: 'The authenticated caller is not a manager',
    type: ErrorResponseDto,
    example: {
      error: 'Insufficient permissions',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async anonymizeUser(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    const user = await this.anonymizeUserUseCase.execute(id);
    return UserResponseMapper.toResponse(user);
  }
}
