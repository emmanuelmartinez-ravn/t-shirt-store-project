import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { JwtAuthGuard } from '../authorization/guards/jwt-auth.guard';
import { PoliciesGuard } from '../authorization/guards/policies.guard';
import { RolesModule } from '../roles/roles.module';
import { AnonymizeUserUseCase } from './application/use-cases/anonymize-user.use-case';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case';
import { PromoteUserToManagerUseCase } from './application/use-cases/promote-user-to-manager.use-case';
import { ToggleUserDisabledUseCase } from './application/use-cases/toggle-user-disabled.use-case';
import { UpdatePasswordUseCase } from './application/use-cases/update-password.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case';
import { UsersController } from './presentation/controllers/users.controller';

@Module({
  imports: [AuthModule, RolesModule, AuthorizationModule],
  controllers: [UsersController],
  providers: [
    PromoteUserToManagerUseCase,
    ToggleUserDisabledUseCase,
    UpdatePasswordUseCase,
    UpdateProfileUseCase,
    DeleteUserUseCase,
    AnonymizeUserUseCase,
    JwtAuthGuard,
    PoliciesGuard,
  ],
})
export class UsersModule {}
