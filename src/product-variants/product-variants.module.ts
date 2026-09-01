import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { JwtAuthGuard } from '../authorization/guards/jwt-auth.guard';
import { PoliciesGuard } from '../authorization/guards/policies.guard';
import { ProductsModule } from '../products/products.module';
import { ProductVariantsController } from './presentation/controllers/product-variants.controller';
import { ProductVariantRepository } from './infrastructure/repositories/product-variant.repository';
import { PrismaProductVariantRepository } from './infrastructure/repositories/prisma-product-variant.repository';
import { CreateProductVariantUseCase } from './application/use-cases/create-product-variant.use-case';

@Module({
  imports: [PrismaModule, AuthorizationModule, ProductsModule],
  controllers: [ProductVariantsController],
  providers: [
    CreateProductVariantUseCase,
    {
      provide: ProductVariantRepository,
      useClass: PrismaProductVariantRepository,
    },
    JwtAuthGuard,
    PoliciesGuard,
  ],
})
export class ProductVariantsModule {}
