import { buildResetPasswordLink } from './frontend-reset-password-link';

describe('buildResetPasswordLink', () => {
  const originalEnv = process.env.FRONTEND_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.FRONTEND_URL;
    } else {
      process.env.FRONTEND_URL = originalEnv;
    }
  });

  it('uses the default frontend.com base url when FRONTEND_URL is unset', () => {
    delete process.env.FRONTEND_URL;

    expect(buildResetPasswordLink('jti-value')).toBe(
      'frontend.com/reset-password/jti-value',
    );
  });

  it('uses the configured FRONTEND_URL when set', () => {
    process.env.FRONTEND_URL = 'https://my-store.com';

    expect(buildResetPasswordLink('jti-value')).toBe(
      'https://my-store.com/reset-password/jti-value',
    );
  });

  it('appends the token to the reset-password path', () => {
    process.env.FRONTEND_URL = 'https://my-store.com';

    expect(buildResetPasswordLink('another-token')).toContain(
      '/reset-password/another-token',
    );
  });
});
