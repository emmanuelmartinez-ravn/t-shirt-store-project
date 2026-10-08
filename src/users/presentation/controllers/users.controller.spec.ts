import { Request } from 'express';
import { User } from '../../../auth/domain/models/user';
import { UserResponseMapper } from '../../../auth/presentation/mappers/user-response.mapper';
import { AnonymizeUserUseCase } from '../../application/use-cases/anonymize-user.use-case';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case';
import { GetUserAvatarUseCase } from '../../application/use-cases/get-user-avatar.use-case';
import { PromoteUserToManagerUseCase } from '../../application/use-cases/promote-user-to-manager.use-case';
import { ToggleUserDisabledUseCase } from '../../application/use-cases/toggle-user-disabled.use-case';
import { UpdateAvatarUseCase } from '../../application/use-cases/update-avatar.use-case';
import { UpdatePasswordUseCase } from '../../application/use-cases/update-password.use-case';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let promoteUserToManagerUseCase: jest.Mocked<PromoteUserToManagerUseCase>;
  let toggleUserDisabledUseCase: jest.Mocked<ToggleUserDisabledUseCase>;
  let updatePasswordUseCase: jest.Mocked<UpdatePasswordUseCase>;
  let updateProfileUseCase: jest.Mocked<UpdateProfileUseCase>;
  let deleteUserUseCase: jest.Mocked<DeleteUserUseCase>;
  let anonymizeUserUseCase: jest.Mocked<AnonymizeUserUseCase>;
  let updateAvatarUseCase: jest.Mocked<UpdateAvatarUseCase>;
  let getUserAvatarUseCase: jest.Mocked<GetUserAvatarUseCase>;

  beforeEach(() => {
    promoteUserToManagerUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<PromoteUserToManagerUseCase>;
    toggleUserDisabledUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ToggleUserDisabledUseCase>;
    updatePasswordUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdatePasswordUseCase>;
    updateProfileUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateProfileUseCase>;
    deleteUserUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeleteUserUseCase>;
    anonymizeUserUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AnonymizeUserUseCase>;
    updateAvatarUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateAvatarUseCase>;
    getUserAvatarUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetUserAvatarUseCase>;

    controller = new UsersController(
      promoteUserToManagerUseCase,
      toggleUserDisabledUseCase,
      updatePasswordUseCase,
      updateProfileUseCase,
      deleteUserUseCase,
      anonymizeUserUseCase,
      updateAvatarUseCase,
      getUserAvatarUseCase,
    );
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAvatar', () => {
    const avatarResponse = {
      avatarUrl: 'https://bucket.s3.amazonaws.com/avatars/user-id/avatar.jpg',
      expiresIn: 3600,
      isDefault: false,
    };

    it('passes the user id and a default avatar url built from the request host to the use case and returns its result', async () => {
      const get = jest.fn().mockReturnValue('localhost:3000');
      const req = { protocol: 'http', get } as unknown as Request;
      getUserAvatarUseCase.execute.mockResolvedValue(avatarResponse);

      const result = await controller.getAvatar('user-id', req);

      expect(get).toHaveBeenCalledWith('host');
      expect(getUserAvatarUseCase.execute).toHaveBeenCalledWith(
        'user-id',
        'http://localhost:3000/static/avatar_default.png',
      );
      expect(result).toBe(avatarResponse);
    });

    it('builds the default avatar url from whatever protocol and host the request carries', async () => {
      const req = {
        protocol: 'https',
        get: jest.fn().mockReturnValue('api.example.com'),
      } as unknown as Request;
      getUserAvatarUseCase.execute.mockResolvedValue(avatarResponse);

      const result = await controller.getAvatar('user-id', req);

      expect(getUserAvatarUseCase.execute).toHaveBeenCalledWith(
        'user-id',
        'https://api.example.com/static/avatar_default.png',
      );
      expect(result).toBe(avatarResponse);
    });
  });

  describe('promote', () => {
    it('delegates to the use case and returns the mapped response', async () => {
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
        roleId: 'manager-role-id',
      });
      promoteUserToManagerUseCase.execute.mockResolvedValue(user);

      const result = await controller.promote('user-id');

      expect(promoteUserToManagerUseCase.execute).toHaveBeenCalledWith(
        'user-id',
      );
      expect(result).toEqual(UserResponseMapper.toResponse(user));
    });
  });

  describe('toggleDisabled', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      const user = User.restore({
        id: 'user-id',
        firstName: 'Joe',
        lastName: 'Doe',
        email: 'joe.doe@example.com',
        hashedPassword: 'hashed',
        avatar: '',
        disabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        roleId: 'role-id',
      });
      toggleUserDisabledUseCase.execute.mockResolvedValue(user);

      const result = await controller.toggleDisabled('user-id');

      expect(toggleUserDisabledUseCase.execute).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(UserResponseMapper.toResponse(user));
    });
  });

  describe('updatePassword', () => {
    it('delegates to the use case with the authenticated user id and returns the mapped response', async () => {
      const user = User.restore({
        id: 'user-id',
        firstName: 'Joe',
        lastName: 'Doe',
        email: 'joe.doe@example.com',
        hashedPassword: 'new-hashed',
        avatar: '',
        disabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        roleId: 'role-id',
      });
      updatePasswordUseCase.execute.mockResolvedValue(user);
      const req = {
        user: {
          sub: 'user-id',
          email: 'joe.doe@example.com',
          role: 'client',
          roleId: 'role-id',
        },
      } as unknown as Request;

      const result = await controller.updatePassword(req, {
        oldPassword: 'OldSecret1!',
        newPassword: 'NewSecret1!',
        confirmPassword: 'NewSecret1!',
      });

      expect(updatePasswordUseCase.execute).toHaveBeenCalledWith('user-id', {
        oldPassword: 'OldSecret1!',
        newPassword: 'NewSecret1!',
      });
      expect(result).toEqual(UserResponseMapper.toResponse(user));
    });
  });

  describe('updateProfile', () => {
    it('delegates to the use case with the authenticated user id and returns the mapped response', async () => {
      const user = User.restore({
        id: 'user-id',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'joe.doe@example.com',
        hashedPassword: 'hashed',
        avatar: '',
        disabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        roleId: 'role-id',
      });
      updateProfileUseCase.execute.mockResolvedValue(user);
      const req = {
        user: {
          sub: 'user-id',
          email: 'joe.doe@example.com',
          role: 'client',
          roleId: 'role-id',
        },
      } as unknown as Request;

      const result = await controller.updateProfile(req, {
        firstName: 'Jane',
        lastName: 'Smith',
      });

      expect(updateProfileUseCase.execute).toHaveBeenCalledWith('user-id', {
        firstName: 'Jane',
        lastName: 'Smith',
      });
      expect(result).toEqual(UserResponseMapper.toResponse(user));
    });
  });

  describe('deleteUser', () => {
    it('delegates to the use case and returns the mapped response', async () => {
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
        deletedAt: new Date(),
        roleId: 'role-id',
      });
      deleteUserUseCase.execute.mockResolvedValue(user);

      const result = await controller.deleteUser('user-id');

      expect(deleteUserUseCase.execute).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(UserResponseMapper.toResponse(user));
    });
  });

  describe('anonymizeUser', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      const user = User.restore({
        id: 'user-id',
        firstName: '***',
        lastName: '***',
        email: '***',
        hashedPassword: 'hashed',
        avatar: '***',
        disabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
        roleId: 'role-id',
      });
      anonymizeUserUseCase.execute.mockResolvedValue(user);

      const result = await controller.anonymizeUser('user-id');

      expect(anonymizeUserUseCase.execute).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(UserResponseMapper.toResponse(user));
    });
  });

  describe('updateAvatar', () => {
    const req = {
      user: {
        sub: 'user-id',
        email: 'joe.doe@example.com',
        role: 'client',
        roleId: 'role-id',
      },
    } as unknown as Request;
    const avatarResponse = {
      avatarUrl: 'https://bucket.s3.amazonaws.com/avatars/user-id/new.jpg',
      expiresIn: 3600,
    };

    it('passes the authenticated user id and the uploaded bytes to the use case and returns its result', async () => {
      const buffer = Buffer.from('image-bytes');
      const file = {
        fieldname: 'image',
        originalname: 'avatar.png',
        mimetype: 'image/png',
        buffer,
        size: buffer.length,
      } as Express.Multer.File;
      updateAvatarUseCase.execute.mockResolvedValue(avatarResponse);

      const result = await controller.updateAvatar(req, file);

      expect(updateAvatarUseCase.execute).toHaveBeenCalledWith('user-id', {
        buffer,
        size: buffer.length,
      });
      expect(result).toBe(avatarResponse);
    });

    it('passes undefined to the use case when no file was uploaded', async () => {
      updateAvatarUseCase.execute.mockResolvedValue(avatarResponse);

      const result = await controller.updateAvatar(req, undefined);

      expect(updateAvatarUseCase.execute).toHaveBeenCalledWith(
        'user-id',
        undefined,
      );
      expect(result).toBe(avatarResponse);
    });
  });
});
