import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CaslAbilityFactory } from './ability/casl-ability.factory';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PoliciesGuard } from './guards/policies.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  providers: [CaslAbilityFactory, JwtAuthGuard, PoliciesGuard],
  exports: [JwtModule, CaslAbilityFactory, JwtAuthGuard, PoliciesGuard],
})
export class AuthorizationModule {}
