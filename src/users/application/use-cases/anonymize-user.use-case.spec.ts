import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../../../auth/domain/models/user';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { AnonymizeUserUseCase } from './anonymize-user.use-case';

describe('AnonymizeUserUseCase', () => {
  let useCase: AnonymizeUserUseCase;
  let userRepository: jest.Mocked<UserRepository>;

  const deletedUser = User.restore({
    id: 'user-id',
    firstName: 'Joe',
    lastName: 'Doe',
    email: 'joe.doe@example.com',
    hashedPassword: 'hashed',
    avatar: 'avatar-url',
    disabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: new Date(),
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

    useCase = new AnonymizeUserUseCase(userRepository);
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
    expect(userRepository.anonymizeUser).not.toHaveBeenCalled();
  });

  it('translates a not-yet-deleted user into a ConflictException', async () => {
    const activeUser = User.restore({ ...deletedUser, deletedAt: null });
    userRepository.getUserById.mockResolvedValue(activeUser);

    const promise = useCase.execute('user-id');

    await expect(promise).rejects.toThrow(ConflictException);
    await expect(promise).rejects.toMatchObject({
      response: {
        error: 'User must be deleted before it can be anonymized',
        details: [],
      },
    });
    expect(userRepository.anonymizeUser).not.toHaveBeenCalled();
  });

  it('anonymizes the user and returns the updated user', async () => {
    const persistedUser = User.restore({
      ...deletedUser,
      firstName: '***',
      lastName: '***',
      email: '***',
      avatar: '***',
    });
    userRepository.getUserById.mockResolvedValue(deletedUser);
    userRepository.anonymizeUser.mockResolvedValue(persistedUser);

    const result = await useCase.execute('user-id');

    expect(userRepository.anonymizeUser).toHaveBeenCalledTimes(1);
    const [calledWith] = userRepository.anonymizeUser.mock.calls[0];
    expect(calledWith.id).toBe(deletedUser.id);
    expect(calledWith.firstName).toBe('***');
    expect(calledWith.lastName).toBe('***');
    expect(calledWith.email).toBe('***');
    expect(calledWith.avatar).toBe('***');
    expect(calledWith.hashedPassword).toBe(deletedUser.hashedPassword);
    expect(calledWith.disabled).toBe(deletedUser.disabled);
    expect(calledWith.roleId).toBe(deletedUser.roleId);
    expect(calledWith.deletedAt).toBe(deletedUser.deletedAt);
    expect(calledWith.updatedAt).toBeInstanceOf(Date);
    expect(result).toBe(persistedUser);
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    userRepository.getUserById.mockResolvedValue(deletedUser);
    userRepository.anonymizeUser.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(useCase.execute('user-id')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
