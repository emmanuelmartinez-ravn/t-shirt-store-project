import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ErrorResponseDto } from '../../../../exceptions/dto/error-response.dto';
import { internalServerErrorExample } from '../../../../exceptions/dto/error-response.example';
import { RefreshUseCase } from '../../../application/use-cases/refresh.use-case';
import { ResendActivationUseCase } from '../../../application/use-cases/resend-activation.use-case';
import { SignInUseCase } from '../../../application/use-cases/sign-in.use-case';
import { SignUpUseCase } from '../../../application/use-cases/sign-up.use-case';
import { VerifyAccountUseCase } from '../../../application/use-cases/verify-account.use-case';
import { AccountActivationTokenResponseDto } from '../../dto/account-activation-token-response';
import { AuthTokensResponseDto } from '../../dto/auth-tokens-response';
import { RefreshDto } from '../../dto/refresh';
import { ResendActivationDto } from '../../dto/resend-activation';
import { SignInDto } from '../../dto/sign-in';
import { SignUpDto } from '../../dto/sign-up';
import { UserResponseDto } from '../../dto/user-response';
import { VerifyAccountDto } from '../../dto/verify-account';
import { AccountActivationTokenResponseMapper } from '../../mappers/account-activation-token-response.mapper';
import { UserResponseMapper } from '../../mappers/user-response.mapper';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly signUpUseCase: SignUpUseCase,
    private readonly verifyAccountUseCase: VerifyAccountUseCase,
    private readonly resendActivationUseCase: ResendActivationUseCase,
    private readonly signInUseCase: SignInUseCase,
    private readonly refreshUseCase: RefreshUseCase,
  ) {}

  @Post('sign-up')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({
    description: 'Created user, pending activation',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    examples: {
      MissingFirstName: {
        summary: 'firstName is missing',
        value: {
          error: 'Bad Request',
          details: ['firstName should not be empty'],
        },
      },
      WeakPassword: {
        summary: 'password does not meet complexity requirements',
        value: {
          error: 'Bad Request',
          details: [
            'password must be at least 8 characters long',
            'password must contain at least one uppercase letter',
          ],
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'User already exists',
    type: ErrorResponseDto,
    example: {
      error: 'User already exists',
      details: ['email must be unique'],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async signUp(@Body() dto: SignUpDto): Promise<UserResponseDto> {
    const user = await this.signUpUseCase.execute(dto);
    return UserResponseMapper.toResponse(user);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify an account with its activation token' })
  @ApiOkResponse({
    description: 'Activated user',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired activation token',
    type: ErrorResponseDto,
    example: {
      error: 'Activation token is invalid or expired',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async verify(@Body() dto: VerifyAccountDto): Promise<UserResponseDto> {
    const user = await this.verifyAccountUseCase.execute(dto.token);
    return UserResponseMapper.toResponse(user);
  }

  @Post('resend-activation')
  @ApiOperation({ summary: 'Resend (or reuse) an account activation token' })
  @ApiOkResponse({
    description: 'A still-valid existing token was found and returned as-is',
    type: AccountActivationTokenResponseDto,
  })
  @ApiCreatedResponse({
    description: 'No valid token existed, so a new one was created',
    type: AccountActivationTokenResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    example: {
      error: 'Bad Request',
      details: ['email should not be empty'],
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
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async resendActivation(
    @Body() dto: ResendActivationDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccountActivationTokenResponseDto> {
    const { token, created } = await this.resendActivationUseCase.execute(
      dto.email,
    );
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return AccountActivationTokenResponseMapper.toResponse(token);
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiOkResponse({
    description: 'Access and refresh tokens',
    type: AuthTokensResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    example: {
      error: 'Bad Request',
      details: ['email should not be empty'],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    type: ErrorResponseDto,
    example: {
      error: 'Invalid email or password',
      details: [],
    },
  })
  @ApiForbiddenResponse({
    description: 'Account is disabled',
    type: ErrorResponseDto,
    example: {
      error: 'Account is disabled',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async signIn(@Body() dto: SignInDto): Promise<AuthTokensResponseDto> {
    return this.signInUseCase.execute(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  @ApiOkResponse({
    description: 'New access and refresh tokens',
    type: AuthTokensResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
    type: ErrorResponseDto,
    example: {
      error: 'Bad Request',
      details: ['refreshToken should not be empty'],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
    type: ErrorResponseDto,
    example: {
      error: 'Refresh token is invalid or expired',
      details: [],
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
    examples: { InternalServerError: internalServerErrorExample },
  })
  public async refresh(
    @Body() dto: RefreshDto,
  ): Promise<AuthTokensResponseDto> {
    return this.refreshUseCase.execute(dto.refreshToken);
  }
}
