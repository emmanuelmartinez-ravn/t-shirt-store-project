import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { JwtAuthGuard } from '../authorization/guards/jwt-auth.guard';
import { PoliciesGuard } from '../authorization/guards/policies.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductVariantsModule } from '../product-variants/product-variants.module';
import { LikeProductVariantUseCase } from './application/use-cases/like-product-variant.use-case';
import { UnlikeProductVariantUseCase } from './application/use-cases/unlike-product-variant.use-case';
import { LikedProductVariantRepository } from './infrastructure/repositories/liked-product-variant.repository';
import { PrismaLikedProductVariantRepository } from './infrastructure/repositories/prisma-liked-product-variant.repository';
import { LikedProductVariantsController } from './presentation/controllers/liked-product-variants.controller';

@Module({
  imports: [PrismaModule, AuthorizationModule, ProductVariantsModule],
  controllers: [LikedProductVariantsController],
  providers: [
    LikeProductVariantUseCase,
    UnlikeProductVariantUseCase,
    {
      provide: LikedProductVariantRepository,
      useClass: PrismaLikedProductVariantRepository,
    },
    JwtAuthGuard,
    PoliciesGuard,
  ],
})
export class LikedProductVariantsModule {}
