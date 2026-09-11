import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { JwtAuthGuard } from '../authorization/guards/jwt-auth.guard';
import { PoliciesGuard } from '../authorization/guards/policies.guard';
import { PromosController } from './presentation/controllers/promos.controller';
import { PromoRepository } from './infrastructure/repositories/promo.repository';
import { PrismaPromoRepository } from './infrastructure/repositories/prisma-promo.repository';
import { CreatePromoUseCase } from './application/use-cases/create-promo.use-case';
import { GetAllPromosUseCase } from './application/use-cases/get-all-promos.use-case';
import { GetPromoByIdUseCase } from './application/use-cases/get-promo-by-id.use-case';
import { GetPromoByCodeUseCase } from './application/use-cases/get-promo-by-code.use-case';
import { UpdatePromoUseCase } from './application/use-cases/update-promo.use-case';
import { DeletePromoUseCase } from './application/use-cases/delete-promo.use-case';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [PromosController],
  providers: [
    CreatePromoUseCase,
    GetAllPromosUseCase,
    GetPromoByIdUseCase,
    GetPromoByCodeUseCase,
    UpdatePromoUseCase,
    DeletePromoUseCase,
    { provide: PromoRepository, useClass: PrismaPromoRepository },
    JwtAuthGuard,
    PoliciesGuard,
  ],
  exports: [PromoRepository],
})
export class PromosModule {}
