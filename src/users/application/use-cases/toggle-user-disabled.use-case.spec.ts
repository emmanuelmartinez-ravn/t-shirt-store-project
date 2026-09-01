import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../../../auth/domain/models/user';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { ToggleUserDisabledUseCase } from './toggle-user-disabled.use-case';

describe('ToggleUserDisabledUseCase', () => {
  let useCase: ToggleUserDisabledUseCase;
  let userRepository: jest.Mocked<UserRepository>;

  const enabledUser = User.restore({
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

  const disabledUser = User.restore({ ...enabledUser, disabled: true });

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

    useCase = new ToggleUserDisabledUseCase(userRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('translates a missing user into a NotFoundException', async () => {
    userRepository.getUserById.mockResolvedValue(null);

    await expect(useCase.execute('user-id')).rejects.toThrow(NotFoundException);
    expect(userRepository.setDisabled).not.toHaveBeenCalled();
  });

  it('translates a soft-deleted user into a NotFoundException', async () => {
    const deletedUser = User.restore({
      ...enabledUser,
      deletedAt: new Date(),
    });
    userRepository.getUserById.mockResolvedValue(deletedUser);

    await expect(useCase.execute('user-id')).rejects.toThrow(NotFoundException);
    expect(userRepository.setDisabled).not.toHaveBeenCalled();
  });

  it('disables an enabled user and returns the updated user', async () => {
    const persistedUser = User.restore({ ...enabledUser, disabled: true });
    userRepository.getUserById.mockResolvedValue(enabledUser);
    userRepository.setDisabled.mockResolvedValue(persistedUser);

    const result = await useCase.execute('user-id');

    expect(userRepository.setDisabled).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-id', disabled: true }),
    );
    expect(result).toBe(persistedUser);
  });

  it('enables a disabled user and returns the updated user', async () => {
    const persistedUser = User.restore({ ...disabledUser, disabled: false });
    userRepository.getUserById.mockResolvedValue(disabledUser);
    userRepository.setDisabled.mockResolvedValue(persistedUser);

    const result = await useCase.execute('user-id');

    expect(userRepository.setDisabled).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-id', disabled: false }),
    );
    expect(result).toBe(persistedUser);
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    userRepository.getUserById.mockResolvedValue(enabledUser);
    userRepository.setDisabled.mockRejectedValue(new Error('connection lost'));

    await expect(useCase.execute('user-id')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
