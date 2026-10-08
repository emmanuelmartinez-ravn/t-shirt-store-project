import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { S3FileStorageService } from './s3-file-storage.service';

describe('S3FileStorageService', () => {
  let service: S3FileStorageService;
  let s3Client: { send: jest.Mock };

  const originalBucket = process.env.AWS_S3_BUCKET;
  const originalTtl = process.env.AWS_S3_SIGNED_URL_TTL;
  const bucket = 'tshirt-store-avatars';
  const key = 'avatars/user-id/avatar-id.jpg';
  const body = Buffer.from('jpeg-bytes');

  beforeEach(() => {
    process.env.AWS_S3_BUCKET = bucket;
    delete process.env.AWS_S3_SIGNED_URL_TTL;

    s3Client = { send: jest.fn().mockResolvedValue({}) };
    service = new S3FileStorageService(s3Client as unknown as S3Client);
  });

  afterEach(() => {
    if (originalBucket === undefined) {
      delete process.env.AWS_S3_BUCKET;
    } else {
      process.env.AWS_S3_BUCKET = originalBucket;
    }
    if (originalTtl === undefined) {
      delete process.env.AWS_S3_SIGNED_URL_TTL;
    } else {
      process.env.AWS_S3_SIGNED_URL_TTL = originalTtl;
    }
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('puts the object into the configured bucket with the given key, body and content type', async () => {
      await service.upload({ key, body, contentType: 'image/jpeg' });

      expect(s3Client.send).toHaveBeenCalledTimes(1);
      const [command] = s3Client.send.mock.calls[0] as [PutObjectCommand];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input).toEqual({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: 'image/jpeg',
      });
    });

    it('propagates s3 errors unchanged', async () => {
      s3Client.send.mockRejectedValue(new Error('AccessDenied'));

      await expect(
        service.upload({ key, body, contentType: 'image/jpeg' }),
      ).rejects.toThrow('AccessDenied');
    });

    it('fails without calling s3 when AWS_S3_BUCKET is not configured', async () => {
      delete process.env.AWS_S3_BUCKET;

      await expect(
        service.upload({ key, body, contentType: 'image/jpeg' }),
      ).rejects.toThrow('AWS_S3_BUCKET is not configured');
      expect(s3Client.send).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes the object with the given key from the configured bucket', async () => {
      await service.delete(key);

      expect(s3Client.send).toHaveBeenCalledTimes(1);
      const [command] = s3Client.send.mock.calls[0] as [DeleteObjectCommand];
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(command.input).toEqual({ Bucket: bucket, Key: key });
    });

    it('propagates s3 errors unchanged', async () => {
      s3Client.send.mockRejectedValue(new Error('NoSuchBucket'));

      await expect(service.delete(key)).rejects.toThrow('NoSuchBucket');
    });

    it('fails without calling s3 when AWS_S3_BUCKET is not configured', async () => {
      delete process.env.AWS_S3_BUCKET;

      await expect(service.delete(key)).rejects.toThrow(
        'AWS_S3_BUCKET is not configured',
      );
      expect(s3Client.send).not.toHaveBeenCalled();
    });
  });

  describe('getSignedUrl', () => {
    // Presigning needs a real client configuration (region, credentials,
    // middleware stack); it signs locally and never touches the network.
    const presigningClient = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
      },
    });

    beforeEach(() => {
      service = new S3FileStorageService(presigningClient);
    });

    it('returns a presigned GET url for the key in the configured bucket with the default ttl', async () => {
      const url = new URL(await service.getSignedUrl(key));

      expect(url.hostname).toContain(bucket);
      expect(url.pathname).toBe(`/${key}`);
      expect(url.searchParams.get('X-Amz-Expires')).toBe('3600');
      expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy();
    });

    it('uses AWS_S3_SIGNED_URL_TTL as the url expiry when configured', async () => {
      process.env.AWS_S3_SIGNED_URL_TTL = '900';

      const url = new URL(await service.getSignedUrl(key));

      expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
    });

    it('fails when AWS_S3_BUCKET is not configured', async () => {
      delete process.env.AWS_S3_BUCKET;

      await expect(service.getSignedUrl(key)).rejects.toThrow(
        'AWS_S3_BUCKET is not configured',
      );
    });
  });
});
