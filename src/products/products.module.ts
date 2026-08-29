import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { JwtAuthGuard } from '../authorization/guards/jwt-auth.guard';
import { PoliciesGuard } from '../authorization/guards/policies.guard';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsController } from './presentation/controllers/products.controller';
import { ProductRepository } from './infrastructure/repositories/product.repository';
import { PrismaProductRepository } from './infrastructure/repositories/prisma-product.repository';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { GetAllProductsUseCase } from './application/use-cases/get-all-products.use-case';
import { GetProductByIdUseCase } from './application/use-cases/get-product-by-id.use-case';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case';
import { DeleteProductUseCase } from './application/use-cases/delete-product.use-case';

@Module({
  imports: [PrismaModule, AuthorizationModule, CategoriesModule],
  controllers: [ProductsController],
  providers: [
    CreateProductUseCase,
    GetAllProductsUseCase,
    GetProductByIdUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    { provide: ProductRepository, useClass: PrismaProductRepository },
    JwtAuthGuard,
    PoliciesGuard,
  ],
})
export class ProductsModule {}
