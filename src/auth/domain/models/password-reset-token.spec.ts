import { PasswordResetToken } from './password-reset-token';

describe('PasswordResetToken', () => {
  it('is defined', () => {
    expect(
      PasswordResetToken.create({ userId: 'user-id', ttlMinutes: 30 }),
    ).toBeDefined();
  });

  describe('create', () => {
    it('generates a fresh id and jti for a brand-new token', () => {
      const token = PasswordResetToken.create({
        userId: 'user-id',
        ttlMinutes: 30,
      });

      expect(token.id).toEqual(expect.any(String));
      expect(token.jti).toEqual(expect.any(String));
      expect(token.id).not.toBe(token.jti);
    });

    it('sets expiresAt to ttlMinutes from now', () => {
      const before = Date.now();

      const token = PasswordResetToken.create({
        userId: 'user-id',
        ttlMinutes: 30,
      });

      const after = Date.now();
      const thirtyMinutesInMs = 30 * 60_000;
      expect(token.expiresAt.getTime()).toBeGreaterThanOrEqual(
        before + thirtyMinutesInMs,
      );
      expect(token.expiresAt.getTime()).toBeLessThanOrEqual(
        after + thirtyMinutesInMs,
      );
    });

    it('sets deletedAt to null and userId to the given value', () => {
      const token = PasswordResetToken.create({
        userId: 'user-id',
        ttlMinutes: 30,
      });

      expect(token.deletedAt).toBeNull();
      expect(token.userId).toBe('user-id');
    });
  });

  describe('restore', () => {
    it('rehydrates all fields as-is from persistence', () => {
      const props = {
        id: 'token-id',
        jti: 'jti-value',
        expiresAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2025-12-01T00:00:00.000Z'),
        updatedAt: new Date('2025-12-02T00:00:00.000Z'),
        deletedAt: null,
        userId: 'user-id',
      };

      const token = PasswordResetToken.restore(props);

      expect(token).toMatchObject(props);
    });
  });
});
