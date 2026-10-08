import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { JwtAuthGuard } from '../authorization/guards/jwt-auth.guard';
import { PoliciesGuard } from '../authorization/guards/policies.guard';
import { CategoriesModule } from '../categories/categories.module';
import { StorageModule } from '../storage/storage.module';
import { ProductVariantRepository } from '../product-variants/infrastructure/repositories/product-variant.repository';
import { PrismaProductVariantRepository } from '../product-variants/infrastructure/repositories/prisma-product-variant.repository';
import { ProductsController } from './presentation/controllers/products.controller';
import { ProductRepository } from './infrastructure/repositories/product.repository';
import { PrismaProductRepository } from './infrastructure/repositories/prisma-product.repository';
import { ProductImageRepository } from './infrastructure/repositories/product-image.repository';
import { PrismaProductImageRepository } from './infrastructure/repositories/prisma-product-image.repository';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { GetAllProductsUseCase } from './application/use-cases/get-all-products.use-case';
import { GetProductByIdUseCase } from './application/use-cases/get-product-by-id.use-case';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case';
import { DeleteProductUseCase } from './application/use-cases/delete-product.use-case';
import { ToggleProductDisabledUseCase } from './application/use-cases/toggle-product-disabled.use-case';
import { UploadProductImagesUseCase } from './application/use-cases/upload-product-images.use-case';
import { DeleteProductImageUseCase } from './application/use-cases/delete-product-image.use-case';
import { LinkProductImageVariantUseCase } from './application/use-cases/link-product-image-variant.use-case';
import { UnlinkProductImageVariantUseCase } from './application/use-cases/unlink-product-image-variant.use-case';
import { ProductImageUrlsService } from './application/services/product-image-urls.service';

@Module({
  imports: [PrismaModule, AuthorizationModule, CategoriesModule, StorageModule],
  controllers: [ProductsController],
  providers: [
    CreateProductUseCase,
    GetAllProductsUseCase,
    GetProductByIdUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    ToggleProductDisabledUseCase,
    UploadProductImagesUseCase,
    DeleteProductImageUseCase,
    LinkProductImageVariantUseCase,
    UnlinkProductImageVariantUseCase,
    ProductImageUrlsService,
    { provide: ProductRepository, useClass: PrismaProductRepository },
    {
      provide: ProductImageRepository,
      useClass: PrismaProductImageRepository,
    },
    // Bound locally: ProductVariantsModule already imports ProductsModule, so importing it here would be circular.
    {
      provide: ProductVariantRepository,
      useClass: PrismaProductVariantRepository,
    },
    JwtAuthGuard,
    PoliciesGuard,
  ],
  exports: [ProductRepository],
})
export class ProductsModule {}
