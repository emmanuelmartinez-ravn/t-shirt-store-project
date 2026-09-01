import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CartRepository } from './infrastructure/repositories/cart.repository';
import { PrismaCartRepository } from './infrastructure/repositories/prisma-cart.repository';

@Module({
  imports: [PrismaModule],
  providers: [{ provide: CartRepository, useClass: PrismaCartRepository }],
  exports: [CartRepository],
})
export class CartsModule {}
