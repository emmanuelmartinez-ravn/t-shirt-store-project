import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RolesModule } from './roles/roles.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { ProductVariantsModule } from './product-variants/product-variants.module';
import { LikedProductVariantsModule } from './liked-product-variants/liked-product-variants.module';
import { UsersModule } from './users/users.module';
import { getRedisConnectionOptions } from './mail/config/redis-connection';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRoot({ connection: getRedisConnectionOptions() }),
    RolesModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    ProductVariantsModule,
    LikedProductVariantsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
