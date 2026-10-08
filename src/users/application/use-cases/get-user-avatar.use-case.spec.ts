import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../../../auth/domain/models/user';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { FileStorageService } from '../../../storage/services/file-storage.service';
import { GetUserAvatarUseCase } from './get-user-avatar.use-case';

describe('GetUserAvatarUseCase', () => {
  let useCase: GetUserAvatarUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let fileStorageService: jest.Mocked<FileStorageService>;

  const originalTtl = process.env.AWS_S3_SIGNED_URL_TTL;

  const avatarKey = 'avatars/user-id/avatar.jpg';
  const user = User.restore({
    id: 'user-id',
    firstName: 'Joe',
    lastName: 'Doe',
    email: 'joe.doe@example.com',
    hashedPassword: 'hashed',
    avatar: avatarKey,
    disabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    roleId: 'role-id',
  });
  const userWithoutAvatar = User.restore({ ...user, avatar: '' });
  const disabledUser = User.restore({ ...user, disabled: true });
  const deletedUser = User.restore({ ...user, deletedAt: new Date() });
  const signedUrl =
    'https://bucket.s3.amazonaws.com/avatars/user-id/avatar.jpg';
  const defaultAvatarUrl = 'http://localhost:3000/static/avatar_default.png';

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

    userRepository.getUserById.mockResolvedValue(user);
    fileStorageService.getSignedUrl.mockResolvedValue(signedUrl);

    useCase = new GetUserAvatarUseCase(userRepository, fileStorageService);
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
    it('returns a presigned url for the stored avatar key with the default ttl', async () => {
      const result = await useCase.execute('user-id', defaultAvatarUrl);

      expect(userRepository.getUserById).toHaveBeenCalledWith('user-id');
      expect(fileStorageService.getSignedUrl).toHaveBeenCalledWith(avatarKey);
      expect(result).toEqual({
        avatarUrl: signedUrl,
        expiresIn: 3600,
        isDefault: false,
      });
    });

    it('reports the configured ttl from AWS_S3_SIGNED_URL_TTL', async () => {
      process.env.AWS_S3_SIGNED_URL_TTL = '900';

      const result = await useCase.execute('user-id', defaultAvatarUrl);

      expect(result).toEqual({
        avatarUrl: signedUrl,
        expiresIn: 900,
        isDefault: false,
      });
    });

    it('returns the default avatar url without touching storage when the user has no avatar', async () => {
      userRepository.getUserById.mockResolvedValue(userWithoutAvatar);

      const result = await useCase.execute('user-id', defaultAvatarUrl);

      expect(userRepository.getUserById).toHaveBeenCalledWith('user-id');
      expect(fileStorageService.getSignedUrl).not.toHaveBeenCalled();
      expect(result).toEqual({
        avatarUrl: defaultAvatarUrl,
        expiresIn: null,
        isDefault: true,
      });
    });

    it('still returns a presigned url for a disabled user', async () => {
      userRepository.getUserById.mockResolvedValue(disabledUser);

      const result = await useCase.execute('user-id', defaultAvatarUrl);

      expect(fileStorageService.getSignedUrl).toHaveBeenCalledWith(avatarKey);
      expect(result).toEqual({
        avatarUrl: signedUrl,
        expiresIn: 3600,
        isDefault: false,
      });
    });

    it('translates a missing user into a NotFoundException', async () => {
      userRepository.getUserById.mockResolvedValue(null);

      const promise = useCase.execute('missing-id', defaultAvatarUrl);

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'User not found', details: [] },
      });
      expect(fileStorageService.getSignedUrl).not.toHaveBeenCalled();
    });

    it('translates a soft-deleted user into a NotFoundException', async () => {
      userRepository.getUserById.mockResolvedValue(deletedUser);

      const promise = useCase.execute('user-id', defaultAvatarUrl);

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'User not found', details: [] },
      });
      expect(fileStorageService.getSignedUrl).not.toHaveBeenCalled();
    });

    it('translates a presigning failure into an InternalServerErrorException', async () => {
      fileStorageService.getSignedUrl.mockRejectedValue(new Error('s3 down'));

      const promise = useCase.execute('user-id', defaultAvatarUrl);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Failed to get avatar', details: [] },
      });
    });

    it('translates a repository failure into an InternalServerErrorException', async () => {
      userRepository.getUserById.mockRejectedValue(new Error('db down'));

      const promise = useCase.execute('user-id', defaultAvatarUrl);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Failed to get avatar', details: [] },
      });
      expect(fileStorageService.getSignedUrl).not.toHaveBeenCalled();
    });
  });
});
