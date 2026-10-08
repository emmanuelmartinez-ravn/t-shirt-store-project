import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { User } from '../../../auth/domain/models/user';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { UnreadableImageError } from '../../../storage/errors/unreadable-image';
import { FileStorageService } from '../../../storage/services/file-storage.service';
import { ImageProcessorService } from '../../../storage/services/image-processor.service';
import { UpdateAvatarUseCase } from './update-avatar.use-case';

describe('UpdateAvatarUseCase', () => {
  let useCase: UpdateAvatarUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let fileStorageService: jest.Mocked<FileStorageService>;
  let imageProcessorService: jest.Mocked<ImageProcessorService>;

  const originalTtl = process.env.AWS_S3_SIGNED_URL_TTL;

  const user = User.restore({
    id: 'user-id',
    firstName: 'Joe',
    lastName: 'Doe',
    email: 'joe.doe@example.com',
    hashedPassword: 'hashed',
    avatar: '',
    disabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    roleId: 'role-id',
  });
  const previousAvatarKey = 'avatars/user-id/previous.jpg';
  const userWithAvatar = User.restore({ ...user, avatar: previousAvatarKey });
  const image = { buffer: Buffer.from('original-image'), size: 1024 };
  const resizedImage = Buffer.from('resized-image');
  const signedUrl = 'https://bucket.s3.amazonaws.com/avatars/user-id/new.jpg';
  const avatarKeyPattern = /^avatars\/user-id\/[0-9a-f-]{36}\.jpg$/;

  const uploadedKey = (): string =>
    fileStorageService.upload.mock.calls[0][0].key;

  beforeEach(() => {
    delete process.env.AWS_S3_SIGNED_URL_TTL;

    userRepository = {
      createUser: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      activateUser: jest.fn(),
      promoteUser: jest.fn(),
      updatePassword: jest.fn(),
      updateProfile: jest.fn(),
      updateAvatar: jest.fn(),
      setDisabled: jest.fn(),
      deleteUser: jest.fn(),
      anonymizeUser: jest.fn(),
    };
    fileStorageService = {
      upload: jest.fn(),
      delete: jest.fn(),
      getSignedUrl: jest.fn(),
    };
    imageProcessorService = {
      getMetadata: jest.fn(),
      resizeToJpeg: jest.fn(),
      normalize: jest.fn(),
    };

    userRepository.getUserById.mockResolvedValue(user);
    userRepository.updateAvatar.mockImplementation((updated) =>
      Promise.resolve(updated),
    );
    imageProcessorService.getMetadata.mockResolvedValue({
      format: 'png',
      width: 800,
      height: 800,
    });
    imageProcessorService.resizeToJpeg.mockResolvedValue(resizedImage);
    fileStorageService.upload.mockResolvedValue(undefined);
    fileStorageService.delete.mockResolvedValue(undefined);
    fileStorageService.getSignedUrl.mockResolvedValue(signedUrl);

    useCase = new UpdateAvatarUseCase(
      userRepository,
      fileStorageService,
      imageProcessorService,
    );
  });

  afterEach(() => {
    if (originalTtl === undefined) {
      delete process.env.AWS_S3_SIGNED_URL_TTL;
    } else {
      process.env.AWS_S3_SIGNED_URL_TTL = originalTtl;
    }
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('resizes, uploads and persists the avatar, then returns a presigned url with the default ttl', async () => {
      const result = await useCase.execute('user-id', image);

      expect(userRepository.getUserById).toHaveBeenCalledWith('user-id');
      expect(imageProcessorService.getMetadata).toHaveBeenCalledWith(
        image.buffer,
      );
      expect(imageProcessorService.resizeToJpeg).toHaveBeenCalledWith(
        image.buffer,
        512,
      );
      expect(fileStorageService.upload).toHaveBeenCalledWith({
        key: expect.stringMatching(avatarKeyPattern) as string,
        body: resizedImage,
        contentType: 'image/jpeg',
      });
      expect(userRepository.updateAvatar).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-id', avatar: uploadedKey() }),
      );
      expect(fileStorageService.getSignedUrl).toHaveBeenCalledWith(
        uploadedKey(),
      );
      expect(result).toEqual({ avatarUrl: signedUrl, expiresIn: 3600 });
    });

    it('generates a distinct storage key for every upload', async () => {
      await useCase.execute('user-id', image);
      await useCase.execute('user-id', image);

      const [first, second] = fileStorageService.upload.mock.calls.map(
        ([params]) => params.key,
      );
      expect(first).not.toBe(second);
    });

    it('reports the configured AWS_S3_SIGNED_URL_TTL as expiresIn', async () => {
      process.env.AWS_S3_SIGNED_URL_TTL = '900';

      const result = await useCase.execute('user-id', image);

      expect(result).toEqual({ avatarUrl: signedUrl, expiresIn: 900 });
    });

    it('accepts a jpeg image', async () => {
      imageProcessorService.getMetadata.mockResolvedValue({
        format: 'jpeg',
        width: 600,
        height: 600,
      });

      await expect(useCase.execute('user-id', image)).resolves.toEqual({
        avatarUrl: signedUrl,
        expiresIn: 3600,
      });
    });

    it.each([512, 1024])(
      'accepts an image exactly at the %ipx boundary',
      async (dimension) => {
        imageProcessorService.getMetadata.mockResolvedValue({
          format: 'png',
          width: dimension,
          height: dimension,
        });

        await useCase.execute('user-id', image);

        expect(fileStorageService.upload).toHaveBeenCalled();
      },
    );

    it('accepts an image exactly at the 2 MB size limit', async () => {
      await useCase.execute('user-id', {
        buffer: image.buffer,
        size: 2 * 1024 * 1024,
      });

      expect(fileStorageService.upload).toHaveBeenCalled();
    });

    it('does not delete anything when the user had no previous avatar', async () => {
      await useCase.execute('user-id', image);

      expect(fileStorageService.delete).not.toHaveBeenCalled();
    });

    it('deletes the previous avatar after the new one has been persisted', async () => {
      userRepository.getUserById.mockResolvedValue(userWithAvatar);

      const result = await useCase.execute('user-id', image);

      expect(fileStorageService.delete).toHaveBeenCalledTimes(1);
      expect(fileStorageService.delete).toHaveBeenCalledWith(previousAvatarKey);
      expect(
        userRepository.updateAvatar.mock.invocationCallOrder[0],
      ).toBeLessThan(fileStorageService.delete.mock.invocationCallOrder[0]);
      expect(result).toEqual({ avatarUrl: signedUrl, expiresIn: 3600 });
    });

    it('still succeeds when deleting the previous avatar fails', async () => {
      userRepository.getUserById.mockResolvedValue(userWithAvatar);
      fileStorageService.delete.mockRejectedValue(new Error('s3 unavailable'));

      const result = await useCase.execute('user-id', image);

      expect(fileStorageService.delete).toHaveBeenCalledWith(previousAvatarKey);
      expect(fileStorageService.getSignedUrl).toHaveBeenCalledWith(
        uploadedKey(),
      );
      expect(result).toEqual({ avatarUrl: signedUrl, expiresIn: 3600 });
    });

    it('translates a missing user into a NotFoundException', async () => {
      userRepository.getUserById.mockResolvedValue(null);

      const promise = useCase.execute('missing-id', image);

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'User not found', details: [] },
      });
      expect(imageProcessorService.getMetadata).not.toHaveBeenCalled();
      expect(fileStorageService.upload).not.toHaveBeenCalled();
    });

    it('translates a soft-deleted user into a NotFoundException', async () => {
      userRepository.getUserById.mockResolvedValue(
        User.restore({ ...user, deletedAt: new Date() }),
      );

      const promise = useCase.execute('user-id', image);

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'User not found', details: [] },
      });
      expect(fileStorageService.upload).not.toHaveBeenCalled();
    });

    it('translates a disabled user into a ForbiddenException', async () => {
      userRepository.getUserById.mockResolvedValue(
        User.restore({ ...user, disabled: true }),
      );

      const promise = useCase.execute('user-id', image);

      await expect(promise).rejects.toThrow(ForbiddenException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'User is disabled', details: [] },
      });
      expect(fileStorageService.upload).not.toHaveBeenCalled();
    });

    it('checks the user before complaining about a missing image', async () => {
      userRepository.getUserById.mockResolvedValue(null);

      await expect(useCase.execute('missing-id', undefined)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects a missing image with a BadRequestException', async () => {
      const promise = useCase.execute('user-id', undefined);

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Image file is required', details: [] },
      });
      expect(imageProcessorService.getMetadata).not.toHaveBeenCalled();
      expect(fileStorageService.upload).not.toHaveBeenCalled();
    });

    it('rejects an image over 2 MB with a PayloadTooLargeException before reading it', async () => {
      const promise = useCase.execute('user-id', {
        buffer: image.buffer,
        size: 2 * 1024 * 1024 + 1,
      });

      await expect(promise).rejects.toThrow(PayloadTooLargeException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Image must be 2 MB or smaller', details: [] },
      });
      expect(imageProcessorService.getMetadata).not.toHaveBeenCalled();
      expect(fileStorageService.upload).not.toHaveBeenCalled();
    });

    it.each([
      ['gif', { format: 'gif', width: 600, height: 600 }],
      ['webp', { format: 'webp', width: 600, height: 600 }],
      ['an unknown format', { format: undefined, width: 600, height: 600 }],
      ['a missing width', { format: 'png', width: undefined, height: 600 }],
      ['a missing height', { format: 'png', width: 600, height: undefined }],
    ])(
      'rejects an image with %s as an UnsupportedMediaTypeException',
      async (_label, metadata) => {
        imageProcessorService.getMetadata.mockResolvedValue(metadata);

        const promise = useCase.execute('user-id', image);

        await expect(promise).rejects.toThrow(UnsupportedMediaTypeException);
        await expect(promise).rejects.toMatchObject({
          response: {
            error: 'Unsupported image format',
            details: ['Accepted formats: png, jpg, jpeg'],
          },
        });
        expect(imageProcessorService.resizeToJpeg).not.toHaveBeenCalled();
        expect(fileStorageService.upload).not.toHaveBeenCalled();
      },
    );

    it('translates unreadable image bytes into an UnsupportedMediaTypeException', async () => {
      imageProcessorService.getMetadata.mockRejectedValue(
        new UnreadableImageError(),
      );

      const promise = useCase.execute('user-id', image);

      await expect(promise).rejects.toThrow(UnsupportedMediaTypeException);
      await expect(promise).rejects.toMatchObject({
        response: {
          error: 'Unsupported image format',
          details: ['Accepted formats: png, jpg, jpeg'],
        },
      });
      expect(fileStorageService.upload).not.toHaveBeenCalled();
    });

    it('rejects a non-square image with a BadRequestException reporting the received dimensions', async () => {
      imageProcessorService.getMetadata.mockResolvedValue({
        format: 'png',
        width: 800,
        height: 600,
      });

      const promise = useCase.execute('user-id', image);

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toMatchObject({
        response: {
          error: 'Image must have a 1:1 aspect ratio',
          details: ['Received 800x600'],
        },
      });
      expect(fileStorageService.upload).not.toHaveBeenCalled();
    });

    it('reports the aspect ratio before the dimension limits', async () => {
      imageProcessorService.getMetadata.mockResolvedValue({
        format: 'png',
        width: 2048,
        height: 1024,
      });

      await expect(useCase.execute('user-id', image)).rejects.toMatchObject({
        response: {
          error: 'Image must have a 1:1 aspect ratio',
          details: ['Received 2048x1024'],
        },
      });
    });

    it('rejects an image larger than 1024x1024 with a BadRequestException', async () => {
      imageProcessorService.getMetadata.mockResolvedValue({
        format: 'png',
        width: 1025,
        height: 1025,
      });

      const promise = useCase.execute('user-id', image);

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toMatchObject({
        response: {
          error: 'Image dimensions must not exceed 1024x1024',
          details: ['Received 1025x1025'],
        },
      });
      expect(fileStorageService.upload).not.toHaveBeenCalled();
    });

    it('rejects an image smaller than 512x512 with a BadRequestException', async () => {
      imageProcessorService.getMetadata.mockResolvedValue({
        format: 'jpeg',
        width: 511,
        height: 511,
      });

      const promise = useCase.execute('user-id', image);

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toMatchObject({
        response: {
          error: 'Image dimensions must be at least 512x512',
          details: ['Received 511x511'],
        },
      });
      expect(fileStorageService.upload).not.toHaveBeenCalled();
    });

    it('translates a resize failure into an InternalServerErrorException without uploading', async () => {
      imageProcessorService.resizeToJpeg.mockRejectedValue(
        new Error('sharp crashed'),
      );

      const promise = useCase.execute('user-id', image);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Failed to update avatar', details: [] },
      });
      expect(fileStorageService.upload).not.toHaveBeenCalled();
    });

    it('translates an upload failure into an InternalServerErrorException without persisting or deleting', async () => {
      userRepository.getUserById.mockResolvedValue(userWithAvatar);
      fileStorageService.upload.mockRejectedValue(new Error('s3 unavailable'));

      const promise = useCase.execute('user-id', image);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Failed to update avatar', details: [] },
      });
      expect(userRepository.updateAvatar).not.toHaveBeenCalled();
      expect(fileStorageService.delete).not.toHaveBeenCalled();
    });

    it('removes the freshly uploaded object and keeps the previous avatar when persisting fails', async () => {
      userRepository.getUserById.mockResolvedValue(userWithAvatar);
      userRepository.updateAvatar.mockRejectedValue(
        new Error('connection lost'),
      );

      const promise = useCase.execute('user-id', image);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Failed to update avatar', details: [] },
      });
      expect(fileStorageService.delete).toHaveBeenCalledTimes(1);
      expect(fileStorageService.delete).toHaveBeenCalledWith(uploadedKey());
      expect(fileStorageService.delete).not.toHaveBeenCalledWith(
        previousAvatarKey,
      );
      expect(fileStorageService.getSignedUrl).not.toHaveBeenCalled();
    });

    it('still reports an InternalServerErrorException when cleaning up the uploaded object also fails', async () => {
      userRepository.updateAvatar.mockRejectedValue(
        new Error('connection lost'),
      );
      fileStorageService.delete.mockRejectedValue(new Error('s3 unavailable'));

      const promise = useCase.execute('user-id', image);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Failed to update avatar', details: [] },
      });
      expect(fileStorageService.delete).toHaveBeenCalledWith(uploadedKey());
    });

    it('translates a presign failure into an InternalServerErrorException', async () => {
      fileStorageService.getSignedUrl.mockRejectedValue(
        new Error('presign failed'),
      );

      const promise = useCase.execute('user-id', image);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Failed to update avatar', details: [] },
      });
    });

    it('translates an unexpected lookup failure into an InternalServerErrorException', async () => {
      userRepository.getUserById.mockRejectedValue(
        new Error('connection lost'),
      );

      const promise = useCase.execute('user-id', image);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Failed to update avatar', details: [] },
      });
    });
  });
});
