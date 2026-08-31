import { getPasswordResetTokenTtlMinutes } from './password-reset-token-ttl';

describe('getPasswordResetTokenTtlMinutes', () => {
  const originalEnv = process.env.PASSWORD_RESET_TOKEN_TTL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.PASSWORD_RESET_TOKEN_TTL;
    } else {
      process.env.PASSWORD_RESET_TOKEN_TTL = originalEnv;
    }
  });

  it('returns the default of 30 minutes when the env var is unset', () => {
    delete process.env.PASSWORD_RESET_TOKEN_TTL;

    expect(getPasswordResetTokenTtlMinutes()).toBe(30);
  });

  it('returns the default when the env var is non-numeric', () => {
    process.env.PASSWORD_RESET_TOKEN_TTL = 'not-a-number';

    expect(getPasswordResetTokenTtlMinutes()).toBe(30);
  });

  it('returns the default when the env var is zero', () => {
    process.env.PASSWORD_RESET_TOKEN_TTL = '0';

    expect(getPasswordResetTokenTtlMinutes()).toBe(30);
  });

  it('returns the default when the env var is negative', () => {
    process.env.PASSWORD_RESET_TOKEN_TTL = '-5';

    expect(getPasswordResetTokenTtlMinutes()).toBe(30);
  });

  it('uses the configured value when it is a valid positive number', () => {
    process.env.PASSWORD_RESET_TOKEN_TTL = '45';

    expect(getPasswordResetTokenTtlMinutes()).toBe(45);
  });
});
