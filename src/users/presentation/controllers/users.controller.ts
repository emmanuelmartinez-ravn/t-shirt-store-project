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
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
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
import { UserResponseDto } from '../../../auth/presentation/dto/user-response';
import { UserResponseMapper } from '../../../auth/presentation/mappers/user-response.mapper';
import { ErrorResponseDto } from '../../../exceptions/dto/error-response.dto';
import { internalServerErrorExample } from '../../../exceptions/dto/error-response.example';
import { AnonymizeUserUseCase } from '../../application/use-cases/anonymize-user.use-case';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case';
import { GetUserAvatarUseCase } from '../../application/use-cases/get-user-avatar.use-case';
import { PromoteUserToManagerUseCase } from '../../application/use-cases/promote-user-to-manager.use-case';
import { ToggleUserDisabledUseCase } from '../../application/use-cases/toggle-user-disabled.use-case';
import { UpdateAvatarUseCase } from '../../application/use-cases/update-avatar.use-case';
import { UpdatePasswordUseCase } from '../../application/use-cases/update-password.use-case';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case';
import { UpdateAvatarResponseDto } from '../dto/update-avatar-response';
import { UpdatePasswordDto } from '../dto/update-password';
import { UpdateProfileDto } from '../dto/update-profile';
import { UserAvatarResponseDto } from '../dto/user-avatar-response';
import {
  AVATAR_IMAGE_FIELD,
  AvatarImageInterceptor,
} from '../interceptors/avatar-image.interceptor';

const DEFAULT_AVATAR_PATH = 'static/avatar_default.png';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly promoteUserToManagerUseCase: PromoteUserToManagerUseCase,
    private readonly toggleUserDisabledUseCase: ToggleUserDisabledUseCase,
    private readonly updatePasswordUseCase: UpdatePasswordUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly anonymizeUserUseCase: AnonymizeUserUseCase,
    private readonly updateAvatarUseCase: UpdateAvatarUseCase,
    private readonly getUserAvatarUseCase: GetUserAvatarUseCase,
  ) {}

  @Get(':id/avatar')
  @ApiOperation({
    summary: "Get a user's avatar URL",
    description:
      'Public endpoint. Returns a time-limited presigned URL to the uploaded ' +
      'avatar, or the URL of the default avatar image if the user has not ' +
      'uploaded one (in which case expiresIn is null).',
  })
  @ApiOkResponse({
    description: 'Avatar URL for the user',
    type: UserAvatarResponseDto,
    examples: {
      CustomAvatar: {
        summary: 'User has uploaded an avatar',
        value: {
          avatarUrl:
            'https://tshirt-store-avatars.s3.us-east-1.amazonaws.com/avatars/3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f/0b8f2c1e-4d3a-4e5f-9a1b-2c3d4e5f6a7b.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600',
          expiresIn: 3600,
          isDefault: false,
        },
      },
      DefaultAvatar: {
        summary: 'User has not uploaded an avatar',
        value: {
          avatarUrl: 'http://localhost:3000/static/avatar_default.png',
          expiresIn: null,
          isDefault: true,
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
  @ApiNotFoundResponse({
    description: 'User not found or deleted',
    type: ErrorResponseDto,
    example: {
      error: 'User not found',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error, e.g. presigning the URL failed',
    type: ErrorResponseDto,
    examples: {
      AvatarFetchFailed: {
        summary: 'Avatar URL could not be generated',
        value: {
          error: 'Failed to get avatar',
          details: [],
        },
      },
    },
  })
  public async getAvatar(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<UserAvatarResponseDto> {
    const defaultAvatarUrl = `${req.protocol}://${req.get('host')}/${DEFAULT_AVATAR_PATH}`;
    return this.getUserAvatarUseCase.execute(id, defaultAvatarUrl);
  }

  @Post(':id/promotion')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired access token',
    type: ErrorResponseDto,
    example: {
      error: 'Invalid or expired token',
      details: [],
    },
  })
  @CheckPolicies((ability) => ability.can(Action.Update, 'User'))
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
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired access token',
    type: ErrorResponseDto,
    example: {
      error: 'Invalid or expired token',
      details: [],
    },
  })
  @CheckPolicies((ability) => ability.can(Action.Update, 'User'))
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
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired access token',
    type: ErrorResponseDto,
    example: {
      error: 'Invalid or expired token',
      details: [],
    },
  })
  @CheckPolicies(() => true)
  @ApiOperation({ summary: "Change the user's password" })
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

  @Patch('avatar')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired access token',
    type: ErrorResponseDto,
    example: {
      error: 'Invalid or expired token',
      details: [],
    },
  })
  @CheckPolicies(() => true)
  @UseInterceptors(AvatarImageInterceptor)
  @ApiOperation({
    summary: "Upload or replace the user's avatar image",
    description:
      'Accepts a square PNG or JPEG between 512x512 and 1024x1024, up to 2 MB. ' +
      'The image is resized to 512x512 JPEG and stored privately; the response ' +
      'contains a time-limited presigned URL to it.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [AVATAR_IMAGE_FIELD],
      properties: {
        [AVATAR_IMAGE_FIELD]: {
          type: 'string',
          format: 'binary',
          description:
            'Square PNG or JPEG image, 512x512 to 1024x1024, <= 2 MB',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Presigned URL for the new avatar',
    type: UpdateAvatarResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Image missing, not 1:1, or outside the allowed dimensions',
    type: ErrorResponseDto,
    examples: {
      ImageRequired: {
        summary: 'No file was sent in the image field',
        value: {
          error: 'Image file is required',
          details: [],
        },
      },
      InvalidAspectRatio: {
        summary: 'Image is not square',
        value: {
          error: 'Image must have a 1:1 aspect ratio',
          details: ['Received 800x600'],
        },
      },
      TooLarge: {
        summary: 'Image is larger than 1024x1024',
        value: {
          error: 'Image dimensions must not exceed 1024x1024',
          details: ['Received 2048x2048'],
        },
      },
      TooSmall: {
        summary: 'Image is smaller than 512x512',
        value: {
          error: 'Image dimensions must be at least 512x512',
          details: ['Received 256x256'],
        },
      },
    },
  })
  @ApiPayloadTooLargeResponse({
    description: 'Image file exceeds 2 MB',
    type: ErrorResponseDto,
    example: {
      error: 'Image must be 2 MB or smaller',
      details: [],
    },
  })
  @ApiUnsupportedMediaTypeResponse({
    description: 'Image is not a readable PNG or JPEG',
    type: ErrorResponseDto,
    example: {
      error: 'Unsupported image format',
      details: ['Accepted formats: png, jpg, jpeg'],
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
    description: 'Unexpected server error, e.g. the storage upload failed',
    type: ErrorResponseDto,
    examples: {
      AvatarUpdateFailed: {
        summary: 'Avatar could not be stored or saved',
        value: {
          error: 'Failed to update avatar',
          details: [],
        },
      },
      InternalServerError: internalServerErrorExample,
    },
  })
  public async updateAvatar(
    @Req() req: Request,
    @UploadedFile() image: Express.Multer.File | undefined,
  ): Promise<UpdateAvatarResponseDto> {
    return this.updateAvatarUseCase.execute(
      req.user!.sub,
      image ? { buffer: image.buffer, size: image.size } : undefined,
    );
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired access token',
    type: ErrorResponseDto,
    example: {
      error: 'Invalid or expired token',
      details: [],
    },
  })
  @CheckPolicies(() => true)
  @ApiOperation({ summary: "Update the user's name" })
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
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired access token',
    type: ErrorResponseDto,
    example: {
      error: 'Invalid or expired token',
      details: [],
    },
  })
  @CheckPolicies((ability) => ability.can(Action.Delete, 'User'))
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
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired access token',
    type: ErrorResponseDto,
    example: {
      error: 'Invalid or expired token',
      details: [],
    },
  })
  @CheckPolicies((ability) => ability.can(Action.Update, 'User'))
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
