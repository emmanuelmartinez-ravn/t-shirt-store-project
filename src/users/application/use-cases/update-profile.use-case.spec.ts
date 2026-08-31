import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../../../auth/domain/models/user';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { UpdateProfileUseCase } from './update-profile.use-case';

describe('UpdateProfileUseCase', () => {
  let useCase: UpdateProfileUseCase;
  let userRepository: jest.Mocked<UserRepository>;

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

  beforeEach(() => {
    userRepository = {
      createUser: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      activateUser: jest.fn(),
      promoteUser: jest.fn(),
      updatePassword: jest.fn(),
      updateProfile: jest.fn(),
    };

    useCase = new UpdateProfileUseCase(userRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('updates and persists the name when the user is found and enabled', async () => {
    userRepository.getUserById.mockResolvedValue(user);
    userRepository.updateProfile.mockImplementation((updated) =>
      Promise.resolve(updated),
    );

    const result = await useCase.execute('user-id', {
      firstName: 'Jane',
      lastName: 'Smith',
    });

    expect(userRepository.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-id',
        firstName: 'Jane',
        lastName: 'Smith',
      }),
    );
    expect(result.firstName).toBe('Jane');
    expect(result.lastName).toBe('Smith');
  });

  it('translates a missing user into a NotFoundException', async () => {
    userRepository.getUserById.mockResolvedValue(null);

    await expect(
      useCase.execute('missing-id', { firstName: 'Jane', lastName: 'Smith' }),
    ).rejects.toThrow(NotFoundException);
    expect(userRepository.updateProfile).not.toHaveBeenCalled();
  });

  it('translates a soft-deleted user into a NotFoundException', async () => {
    const deletedUser = User.restore({ ...user, deletedAt: new Date() });
    userRepository.getUserById.mockResolvedValue(deletedUser);

    await expect(
      useCase.execute('user-id', { firstName: 'Jane', lastName: 'Smith' }),
    ).rejects.toThrow(NotFoundException);
    expect(userRepository.updateProfile).not.toHaveBeenCalled();
  });

  it('translates a disabled user into a ForbiddenException', async () => {
    const disabledUser = User.restore({ ...user, disabled: true });
    userRepository.getUserById.mockResolvedValue(disabledUser);

    await expect(
      useCase.execute('user-id', { firstName: 'Jane', lastName: 'Smith' }),
    ).rejects.toThrow(ForbiddenException);
    expect(userRepository.updateProfile).not.toHaveBeenCalled();
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    userRepository.getUserById.mockRejectedValue(new Error('connection lost'));

    await expect(
      useCase.execute('user-id', { firstName: 'Jane', lastName: 'Smith' }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
