import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;

  const buildContext = (request: Partial<Request>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    guard = new JwtAuthGuard(jwtService);
  });

  it('is defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('rejects a request with no authorization header', async () => {
      const context = buildContext({ headers: {} });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('rejects a request whose token has expired or is invalid', async () => {
      const context = buildContext({
        headers: { authorization: 'Bearer expired-token' },
      });
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('attaches the decoded payload to the request and allows access', async () => {
      const request: Partial<Request> = {
        headers: { authorization: 'Bearer valid-token' },
      };
      const context = buildContext(request);
      const payload = {
        sub: 'user-id',
        email: 'manager@example.com',
        role: 'manager',
        roleId: 'role-id',
      };
      jwtService.verifyAsync.mockResolvedValue(payload);

      const result = await guard.canActivate(context);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
      expect(request.user).toEqual(payload);
      expect(result).toBe(true);
    });
  });
});
