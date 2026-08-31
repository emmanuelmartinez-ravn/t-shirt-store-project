import { Request } from 'express';
import { User } from '../../../auth/domain/models/user';
import { UserResponseMapper } from '../../../auth/presentation/mappers/user-response.mapper';
import { PromoteUserToManagerUseCase } from '../../application/use-cases/promote-user-to-manager.use-case';
import { UpdatePasswordUseCase } from '../../application/use-cases/update-password.use-case';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let promoteUserToManagerUseCase: jest.Mocked<PromoteUserToManagerUseCase>;
  let updatePasswordUseCase: jest.Mocked<UpdatePasswordUseCase>;

  beforeEach(() => {
    promoteUserToManagerUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<PromoteUserToManagerUseCase>;
    updatePasswordUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdatePasswordUseCase>;

    controller = new UsersController(
      promoteUserToManagerUseCase,
      updatePasswordUseCase,
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
});
