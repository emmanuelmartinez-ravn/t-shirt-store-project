import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { JwtAuthGuard } from '../authorization/guards/jwt-auth.guard';
import { PoliciesGuard } from '../authorization/guards/policies.guard';
import { RolesModule } from '../roles/roles.module';
import { PromoteUserToManagerUseCase } from './application/use-cases/promote-user-to-manager.use-case';
import { UsersController } from './presentation/controllers/users.controller';

@Module({
  imports: [AuthModule, RolesModule, AuthorizationModule],
  controllers: [UsersController],
  providers: [PromoteUserToManagerUseCase, JwtAuthGuard, PoliciesGuard],
})
export class UsersModule {}
