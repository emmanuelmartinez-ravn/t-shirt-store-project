import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { JwtAuthGuard } from '../authorization/guards/jwt-auth.guard';
import { PoliciesGuard } from '../authorization/guards/policies.guard';
import { RolesController } from './presentation/controllers/roles.controller';
import { RoleRepository } from './infrastructure/repositories/role.repository';
import { PrismaRoleRepository } from './infrastructure/repositories/prisma-role.repository';
import { CreateRoleUseCase } from './application/use-cases/create-role.use-case';
import { UpdateRoleUseCase } from './application/use-cases/update-role.use-case';
import { DeleteRoleUseCase } from './application/use-cases/delete-role.use-case';
import { GetAllRolesUseCase } from './application/use-cases/get-all-roles.use-case';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [RolesController],
  providers: [
    CreateRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
    GetAllRolesUseCase,
    { provide: RoleRepository, useClass: PrismaRoleRepository },
    JwtAuthGuard,
    PoliciesGuard,
  ],
  exports: [RoleRepository],
})
export class RolesModule {}
