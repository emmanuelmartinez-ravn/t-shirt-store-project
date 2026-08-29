import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  AppAbility,
  CaslAbilityFactory,
} from '../ability/casl-ability.factory';
import { PoliciesGuard } from './policies.guard';

describe('PoliciesGuard', () => {
  let guard: PoliciesGuard;
  let reflector: jest.Mocked<Reflector>;
  let caslAbilityFactory: jest.Mocked<CaslAbilityFactory>;

  const buildContext = (request: Partial<Request>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    caslAbilityFactory = {
      createForUser: jest.fn(),
    };

    guard = new PoliciesGuard(reflector, caslAbilityFactory);
  });

  it('is defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('allows access when the route has no policy handlers', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = buildContext({});

      expect(guard.canActivate(context)).toBe(true);
      expect(caslAbilityFactory.createForUser).not.toHaveBeenCalled();
    });

    it('rejects an unauthenticated request when policies are required', () => {
      reflector.getAllAndOverride.mockReturnValue([() => true]);
      const context = buildContext({ user: undefined });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('allows access when every policy handler is satisfied', () => {
      const ability = {} as AppAbility;
      reflector.getAllAndOverride.mockReturnValue([() => true]);
      caslAbilityFactory.createForUser.mockReturnValue(ability);
      const context = buildContext({
        user: {
          sub: 'user-id',
          email: 'a@b.com',
          role: 'manager',
          roleId: 'r',
        },
      });

      expect(guard.canActivate(context)).toBe(true);
      expect(caslAbilityFactory.createForUser).toHaveBeenCalledWith('manager');
    });

    it('rejects access when a policy handler is not satisfied', () => {
      reflector.getAllAndOverride.mockReturnValue([() => false]);
      caslAbilityFactory.createForUser.mockReturnValue({} as AppAbility);
      const context = buildContext({
        user: { sub: 'user-id', email: 'a@b.com', role: 'client', roleId: 'r' },
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
