import {
  GoneException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../../../auth/domain/models/user';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { DeleteUserUseCase } from './delete-user.use-case';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let userRepository: jest.Mocked<UserRepository>;

  const activeUser = User.restore({
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

  beforeEach(() => {
    userRepository = {
      createUser: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      activateUser: jest.fn(),
      promoteUser: jest.fn(),
      updatePassword: jest.fn(),
      updateProfile: jest.fn(),
      setDisabled: jest.fn(),
      deleteUser: jest.fn(),
      anonymizeUser: jest.fn(),
    };

    useCase = new DeleteUserUseCase(userRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('translates a missing user into a NotFoundException', async () => {
    userRepository.getUserById.mockResolvedValue(null);

    const promise = useCase.execute('user-id');

    await expect(promise).rejects.toThrow(NotFoundException);
    await expect(promise).rejects.toMatchObject({
      response: { error: 'User not found', details: [] },
    });
    expect(userRepository.deleteUser).not.toHaveBeenCalled();
  });

  it('translates an already-deleted user into a GoneException', async () => {
    const deletedUser = User.restore({
      ...activeUser,
      deletedAt: new Date(),
    });
    userRepository.getUserById.mockResolvedValue(deletedUser);

    const promise = useCase.execute('user-id');

    await expect(promise).rejects.toThrow(GoneException);
    await expect(promise).rejects.toMatchObject({
      response: { error: 'User already deleted', details: [] },
    });
    expect(userRepository.deleteUser).not.toHaveBeenCalled();
  });

  it('soft-deletes the user and returns the updated user', async () => {
    const persistedUser = User.restore({
      ...activeUser,
      deletedAt: new Date(),
    });
    userRepository.getUserById.mockResolvedValue(activeUser);
    userRepository.deleteUser.mockResolvedValue(persistedUser);

    const result = await useCase.execute('user-id');

    expect(userRepository.deleteUser).toHaveBeenCalledTimes(1);
    const [calledWith] = userRepository.deleteUser.mock.calls[0];
    expect(calledWith.id).toBe('user-id');
    expect(calledWith.deletedAt).toBeInstanceOf(Date);
    expect(calledWith.updatedAt).toBeInstanceOf(Date);
    expect(result).toBe(persistedUser);
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    userRepository.getUserById.mockResolvedValue(activeUser);
    userRepository.deleteUser.mockRejectedValue(new Error('connection lost'));

    await expect(useCase.execute('user-id')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
