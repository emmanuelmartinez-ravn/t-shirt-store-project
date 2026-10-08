import { S3Client } from '@aws-sdk/client-s3';
import { createS3Client, getS3BucketName } from './s3-client';

describe('getS3BucketName', () => {
  const originalEnv = process.env.AWS_S3_BUCKET;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AWS_S3_BUCKET;
    } else {
      process.env.AWS_S3_BUCKET = originalEnv;
    }
  });

  it('returns the configured bucket name', () => {
    process.env.AWS_S3_BUCKET = 'tshirt-store-avatars';

    expect(getS3BucketName()).toBe('tshirt-store-avatars');
  });

  it('throws when AWS_S3_BUCKET is unset', () => {
    delete process.env.AWS_S3_BUCKET;

    expect(() => getS3BucketName()).toThrow('AWS_S3_BUCKET is not configured');
  });

  it('throws when AWS_S3_BUCKET is empty', () => {
    process.env.AWS_S3_BUCKET = '';

    expect(() => getS3BucketName()).toThrow('AWS_S3_BUCKET is not configured');
  });
});

describe('createS3Client', () => {
  const originalEnv = process.env.AWS_REGION;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AWS_REGION;
    } else {
      process.env.AWS_REGION = originalEnv;
    }
  });

  it('builds an s3 client for the configured AWS_REGION', async () => {
    process.env.AWS_REGION = 'eu-west-1';

    const client = createS3Client();

    expect(client).toBeInstanceOf(S3Client);
    await expect(client.config.region()).resolves.toBe('eu-west-1');
  });
});
