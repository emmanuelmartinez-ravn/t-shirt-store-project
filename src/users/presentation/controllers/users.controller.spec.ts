import { Request } from 'express';
import { User } from '../../../auth/domain/models/user';
import { UserResponseMapper } from '../../../auth/presentation/mappers/user-response.mapper';
import { AnonymizeUserUseCase } from '../../application/use-cases/anonymize-user.use-case';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case';
import { PromoteUserToManagerUseCase } from '../../application/use-cases/promote-user-to-manager.use-case';
import { ToggleUserDisabledUseCase } from '../../application/use-cases/toggle-user-disabled.use-case';
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

    controller = new UsersController(
      promoteUserToManagerUseCase,
      toggleUserDisabledUseCase,
      updatePasswordUseCase,
      updateProfileUseCase,
      deleteUserUseCase,
      anonymizeUserUseCase,
    );
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
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
});
