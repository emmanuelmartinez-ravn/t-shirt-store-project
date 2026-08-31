import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesModule } from '../roles/roles.module';
import { MailModule } from '../mail/mail.module';
import { AuthController } from './presentation/controllers/auth/auth.controller';
import { AccountActivationTokensScheduler } from './presentation/schedulers/account-activation-tokens.scheduler';
import { UserRepository } from './infrastructure/repositories/user.repository';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { AccountActivationTokenRepository } from './infrastructure/repositories/account-activation-token.repository';
import { PrismaAccountActivationTokenRepository } from './infrastructure/repositories/prisma-account-activation-token.repository';
import { RefreshTokenRepository } from './infrastructure/repositories/refresh-token.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/repositories/prisma-refresh-token.repository';
import { IssueAuthTokensService } from './application/services/issue-auth-tokens.service';
import { SignUpUseCase } from './application/use-cases/sign-up.use-case';
import { VerifyAccountUseCase } from './application/use-cases/verify-account.use-case';
import { ResendActivationUseCase } from './application/use-cases/resend-activation.use-case';
import { SignInUseCase } from './application/use-cases/sign-in.use-case';
import { RefreshUseCase } from './application/use-cases/refresh.use-case';
import { DeleteExpiredAccountActivationTokensUseCase } from './application/use-cases/delete-expired-account-activation-tokens.use-case';

@Module({
  imports: [
    PrismaModule,
    RolesModule,
    MailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    SignUpUseCase,
    VerifyAccountUseCase,
    ResendActivationUseCase,
    SignInUseCase,
    RefreshUseCase,
    IssueAuthTokensService,
    DeleteExpiredAccountActivationTokensUseCase,
    AccountActivationTokensScheduler,
    { provide: UserRepository, useClass: PrismaUserRepository },
    {
      provide: AccountActivationTokenRepository,
      useClass: PrismaAccountActivationTokenRepository,
    },
    { provide: RefreshTokenRepository, useClass: PrismaRefreshTokenRepository },
  ],
  exports: [UserRepository],
})
export class AuthModule {}
