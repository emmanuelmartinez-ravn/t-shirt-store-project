import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { JwtAuthGuard } from '../authorization/guards/jwt-auth.guard';
import { PoliciesGuard } from '../authorization/guards/policies.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { CartsModule } from '../carts/carts.module';
import { ProductVariantsModule } from '../product-variants/product-variants.module';
import { AddCartItemUseCase } from './application/use-cases/add-cart-item.use-case';
import { CartItemRepository } from './infrastructure/repositories/cart-item.repository';
import { PrismaCartItemRepository } from './infrastructure/repositories/prisma-cart-item.repository';
import { CartItemsController } from './presentation/controllers/cart-items.controller';

@Module({
  imports: [
    PrismaModule,
    AuthorizationModule,
    CartsModule,
    ProductVariantsModule,
  ],
  controllers: [CartItemsController],
  providers: [
    AddCartItemUseCase,
    { provide: CartItemRepository, useClass: PrismaCartItemRepository },
    JwtAuthGuard,
    PoliciesGuard,
  ],
})
export class CartItemsModule {}
