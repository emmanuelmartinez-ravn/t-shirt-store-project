import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../../../auth/domain/models/user';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { Role } from '../../../roles/domain/models/role';
import { RoleRepository } from '../../../roles/infrastructure/repositories/role.repository';
import { PromoteUserToManagerUseCase } from './promote-user-to-manager.use-case';

describe('PromoteUserToManagerUseCase', () => {
  let useCase: PromoteUserToManagerUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let roleRepository: jest.Mocked<RoleRepository>;

  const clientRole = Role.restore({
    id: 'client-role-id',
    name: 'client',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  const managerRole = Role.restore({
    id: 'manager-role-id',
    name: 'manager',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  const clientUser = User.restore({
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
    roleId: clientRole.id,
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
    roleRepository = {
      createRole: jest.fn(),
      getAllRoles: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
      getRoleByName: jest.fn(),
      getRoleById: jest.fn(),
    };

    useCase = new PromoteUserToManagerUseCase(userRepository, roleRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('promotes a client to manager and returns the updated user', async () => {
    const promotedUser = User.restore({
      ...clientUser,
      roleId: managerRole.id,
    });
    userRepository.getUserById.mockResolvedValue(clientUser);
    roleRepository.getRoleById.mockResolvedValue(clientRole);
    roleRepository.getRoleByName.mockResolvedValue(managerRole);
    userRepository.promoteUser.mockResolvedValue(promotedUser);

    const result = await useCase.execute('user-id');

    expect(roleRepository.getRoleByName).toHaveBeenCalledWith('manager');
    expect(userRepository.promoteUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-id', roleId: managerRole.id }),
    );
    expect(result).toBe(promotedUser);
  });

  it('translates a missing user into a NotFoundException', async () => {
    userRepository.getUserById.mockResolvedValue(null);

    await expect(useCase.execute('user-id')).rejects.toThrow(NotFoundException);
    expect(userRepository.promoteUser).not.toHaveBeenCalled();
  });

  it('translates a soft-deleted user into a NotFoundException', async () => {
    const deletedUser = User.restore({ ...clientUser, deletedAt: new Date() });
    userRepository.getUserById.mockResolvedValue(deletedUser);

    await expect(useCase.execute('user-id')).rejects.toThrow(NotFoundException);
    expect(userRepository.promoteUser).not.toHaveBeenCalled();
  });

  it('translates a disabled user into a ForbiddenException', async () => {
    const disabledUser = User.restore({ ...clientUser, disabled: true });
    userRepository.getUserById.mockResolvedValue(disabledUser);

    await expect(useCase.execute('user-id')).rejects.toThrow(
      ForbiddenException,
    );
    expect(userRepository.promoteUser).not.toHaveBeenCalled();
  });

  it('translates an already-manager user into a ConflictException', async () => {
    const managerUser = User.restore({ ...clientUser, roleId: managerRole.id });
    userRepository.getUserById.mockResolvedValue(managerUser);
    roleRepository.getRoleById.mockResolvedValue(managerRole);

    await expect(useCase.execute('user-id')).rejects.toThrow(ConflictException);
    expect(userRepository.promoteUser).not.toHaveBeenCalled();
  });

  it('translates a user with a role other than client into a ConflictException', async () => {
    const businessRole = Role.restore({
      id: 'business-role-id',
      name: 'business',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    const businessUser = User.restore({
      ...clientUser,
      roleId: businessRole.id,
    });
    userRepository.getUserById.mockResolvedValue(businessUser);
    roleRepository.getRoleById.mockResolvedValue(businessRole);

    await expect(useCase.execute('user-id')).rejects.toThrow(ConflictException);
    expect(userRepository.promoteUser).not.toHaveBeenCalled();
  });

  it('translates a missing manager role into an InternalServerErrorException', async () => {
    userRepository.getUserById.mockResolvedValue(clientUser);
    roleRepository.getRoleById.mockResolvedValue(clientRole);
    roleRepository.getRoleByName.mockResolvedValue(null);

    await expect(useCase.execute('user-id')).rejects.toThrow(
      InternalServerErrorException,
    );
    expect(userRepository.promoteUser).not.toHaveBeenCalled();
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    userRepository.getUserById.mockResolvedValue(clientUser);
    roleRepository.getRoleById.mockResolvedValue(clientRole);
    roleRepository.getRoleByName.mockResolvedValue(managerRole);
    userRepository.promoteUser.mockRejectedValue(new Error('connection lost'));

    await expect(useCase.execute('user-id')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
