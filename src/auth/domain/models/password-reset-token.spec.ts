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

  describe('consume', () => {
    it('sets updatedAt and deletedAt to now while preserving other fields', () => {
      const token = PasswordResetToken.restore({
        id: 'token-id',
        jti: 'jti-value',
        expiresAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2025-12-01T00:00:00.000Z'),
        updatedAt: new Date('2025-12-02T00:00:00.000Z'),
        deletedAt: null,
        userId: 'user-id',
      });
      const before = Date.now();

      const consumed = PasswordResetToken.consume(token);

      const after = Date.now();
      expect(consumed.id).toBe(token.id);
      expect(consumed.jti).toBe(token.jti);
      expect(consumed.expiresAt).toBe(token.expiresAt);
      expect(consumed.createdAt).toBe(token.createdAt);
      expect(consumed.userId).toBe(token.userId);
      expect(consumed.deletedAt).not.toBeNull();
      expect(consumed.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(consumed.updatedAt.getTime()).toBeLessThanOrEqual(after);
      expect(consumed.deletedAt?.getTime()).toBeGreaterThanOrEqual(before);
      expect(consumed.deletedAt?.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('isExpired', () => {
    it('returns true when expiresAt is in the past', () => {
      const token = PasswordResetToken.restore({
        id: 'token-id',
        jti: 'jti-value',
        expiresAt: new Date(Date.now() - 60_000),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        userId: 'user-id',
      });

      expect(token.isExpired()).toBe(true);
    });

    it('returns false when expiresAt is in the future', () => {
      const token = PasswordResetToken.restore({
        id: 'token-id',
        jti: 'jti-value',
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        userId: 'user-id',
      });

      expect(token.isExpired()).toBe(false);
    });
  });
});
