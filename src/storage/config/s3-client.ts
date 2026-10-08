import { S3Client } from '@aws-sdk/client-s3';

export function createS3Client(): S3Client {
  return new S3Client({ region: process.env.AWS_REGION });
}

export function getS3BucketName(): string {
  const bucket = process.env.AWS_S3_BUCKET;

  if (!bucket) {
    throw new Error('AWS_S3_BUCKET is not configured');
  }

  return bucket;
}
