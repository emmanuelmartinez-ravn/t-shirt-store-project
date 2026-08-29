import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { JwtAuthGuard } from '../authorization/guards/jwt-auth.guard';
import { PoliciesGuard } from '../authorization/guards/policies.guard';
import { CategoriesController } from './presentation/controllers/categories.controller';
import { CategoryRepository } from './infrastructure/repositories/category.repository';
import { PrismaCategoryRepository } from './infrastructure/repositories/prisma-category.repository';
import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { GetAllCategoriesUseCase } from './application/use-cases/get-all-categories.use-case';
import { GetCategoryByIdUseCase } from './application/use-cases/get-category-by-id.use-case';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.use-case';
import { DeleteCategoryUseCase } from './application/use-cases/delete-category.use-case';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [CategoriesController],
  providers: [
    CreateCategoryUseCase,
    GetAllCategoriesUseCase,
    GetCategoryByIdUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    { provide: CategoryRepository, useClass: PrismaCategoryRepository },
    JwtAuthGuard,
    PoliciesGuard,
  ],
})
export class CategoriesModule {}
