import { getSignedUrlTtlSeconds } from './signed-url-ttl';

describe('getSignedUrlTtlSeconds', () => {
  const originalEnv = process.env.AWS_S3_SIGNED_URL_TTL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AWS_S3_SIGNED_URL_TTL;
    } else {
      process.env.AWS_S3_SIGNED_URL_TTL = originalEnv;
    }
  });

  it('returns the default of 3600 seconds when the env var is unset', () => {
    delete process.env.AWS_S3_SIGNED_URL_TTL;

    expect(getSignedUrlTtlSeconds()).toBe(3600);
  });

  it('returns the default when the env var is non-numeric', () => {
    process.env.AWS_S3_SIGNED_URL_TTL = 'not-a-number';

    expect(getSignedUrlTtlSeconds()).toBe(3600);
  });

  it('returns the default when the env var is zero', () => {
    process.env.AWS_S3_SIGNED_URL_TTL = '0';

    expect(getSignedUrlTtlSeconds()).toBe(3600);
  });

  it('returns the default when the env var is negative', () => {
    process.env.AWS_S3_SIGNED_URL_TTL = '-60';

    expect(getSignedUrlTtlSeconds()).toBe(3600);
  });

  it('uses the configured value when it is a valid positive number', () => {
    process.env.AWS_S3_SIGNED_URL_TTL = '900';

    expect(getSignedUrlTtlSeconds()).toBe(900);
  });
});
