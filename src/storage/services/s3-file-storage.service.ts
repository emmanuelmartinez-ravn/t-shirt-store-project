import { Inject, Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl as createPresignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3BucketName } from '../config/s3-client';
import { getSignedUrlTtlSeconds } from '../config/signed-url-ttl';
import { S3_CLIENT } from '../storage.constants';
import { FileStorageService } from './file-storage.service';

@Injectable()
export class S3FileStorageService extends FileStorageService {
  constructor(@Inject(S3_CLIENT) private readonly s3Client: S3Client) {
    super();
  }

  async upload(params: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: getS3BucketName(),
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: getS3BucketName(), Key: key }),
    );
  }

  async getSignedUrl(key: string): Promise<string> {
    return createPresignedUrl(
      this.s3Client,
      new GetObjectCommand({ Bucket: getS3BucketName(), Key: key }),
      { expiresIn: getSignedUrlTtlSeconds() },
    );
  }
}
