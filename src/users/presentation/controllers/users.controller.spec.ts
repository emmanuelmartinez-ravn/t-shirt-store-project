import { User } from '../../../auth/domain/models/user';
import { UserResponseMapper } from '../../../auth/presentation/mappers/user-response.mapper';
import { PromoteUserToManagerUseCase } from '../../application/use-cases/promote-user-to-manager.use-case';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let promoteUserToManagerUseCase: jest.Mocked<PromoteUserToManagerUseCase>;

  beforeEach(() => {
    promoteUserToManagerUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<PromoteUserToManagerUseCase>;

    controller = new UsersController(promoteUserToManagerUseCase);
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
});
