import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../../../auth/domain/models/user';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { UpdatePasswordUseCase } from './update-password.use-case';

describe('UpdatePasswordUseCase', () => {
  let useCase: UpdatePasswordUseCase;
  let userRepository: jest.Mocked<UserRepository>;

  const oldPassword = 'OldSecret1!';
  const user = User.restore({
    id: 'user-id',
    firstName: 'Joe',
    lastName: 'Doe',
    email: 'joe.doe@example.com',
    hashedPassword: bcrypt.hashSync(oldPassword, 10),
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
    };

    useCase = new UpdatePasswordUseCase(userRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('hashes and persists the new password when the old one matches', async () => {
    userRepository.getUserById.mockResolvedValue(user);
    userRepository.updatePassword.mockImplementation((updated) =>
      Promise.resolve(updated),
    );

    const result = await useCase.execute('user-id', {
      oldPassword,
      newPassword: 'NewSecret1!',
    });

    const [persistedArg] = userRepository.updatePassword.mock.calls[0];
    expect(persistedArg.hashedPassword).not.toBe(user.hashedPassword);
    expect(bcrypt.compareSync('NewSecret1!', persistedArg.hashedPassword)).toBe(
      true,
    );
    expect(result.hashedPassword).toBe(persistedArg.hashedPassword);
  });

  it('translates a missing user into a NotFoundException', async () => {
    userRepository.getUserById.mockResolvedValue(null);

    await expect(
      useCase.execute('missing-id', {
        oldPassword,
        newPassword: 'NewSecret1!',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(userRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('translates a soft-deleted user into a NotFoundException', async () => {
    const deletedUser = User.restore({ ...user, deletedAt: new Date() });
    userRepository.getUserById.mockResolvedValue(deletedUser);

    await expect(
      useCase.execute('user-id', {
        oldPassword,
        newPassword: 'NewSecret1!',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(userRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('translates a disabled user into a ForbiddenException', async () => {
    const disabledUser = User.restore({ ...user, disabled: true });
    userRepository.getUserById.mockResolvedValue(disabledUser);

    await expect(
      useCase.execute('user-id', {
        oldPassword,
        newPassword: 'NewSecret1!',
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(userRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('translates a mismatched old password into a BadRequestException', async () => {
    userRepository.getUserById.mockResolvedValue(user);

    await expect(
      useCase.execute('user-id', {
        oldPassword: 'WrongPassword1!',
        newPassword: 'NewSecret1!',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(userRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    userRepository.getUserById.mockRejectedValue(new Error('connection lost'));

    await expect(
      useCase.execute('user-id', {
        oldPassword,
        newPassword: 'NewSecret1!',
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
