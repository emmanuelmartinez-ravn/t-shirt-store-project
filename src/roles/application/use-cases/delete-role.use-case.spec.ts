import {
  GoneException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../../domain/models/role';
import { RoleRepository } from '../../infrastructure/repositories/role.repository';
import { DeleteRoleUseCase } from './delete-role.use-case';

describe('DeleteRoleUseCase', () => {
  let useCase: DeleteRoleUseCase;
  let roleRepository: jest.Mocked<RoleRepository>;

  const existingRole = Role.restore({
    id: 'role-id',
    name: 'client',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  beforeEach(() => {
    roleRepository = {
      createRole: jest.fn(),
      getAllRoles: jest.fn(),
      getRoleByName: jest.fn(),
      getRoleById: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
    };

    useCase = new DeleteRoleUseCase(roleRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('soft-deletes and returns the role', async () => {
    const persistedRole = Role.restore({
      id: 'role-id',
      name: 'client',
      createdAt: existingRole.createdAt,
      updatedAt: existingRole.updatedAt,
      deletedAt: new Date(),
    });
    roleRepository.getRoleById.mockResolvedValue(existingRole);
    roleRepository.deleteRole.mockResolvedValue(persistedRole);

    const result = await useCase.execute('role-id');

    const [deletedRole] = roleRepository.deleteRole.mock.calls[0];
    expect(deletedRole.id).toBe('role-id');
    expect(deletedRole.deletedAt).toBeInstanceOf(Date);
    expect(result).toBe(persistedRole);
  });

  it('translates a missing role into a NotFoundException', async () => {
    roleRepository.getRoleById.mockResolvedValue(null);

    await expect(useCase.execute('role-id')).rejects.toThrow(NotFoundException);
    expect(roleRepository.deleteRole).not.toHaveBeenCalled();
  });

  it('translates an already-deleted role into a GoneException', async () => {
    const alreadyDeletedRole = Role.restore({
      id: 'role-id',
      name: 'client',
      createdAt: existingRole.createdAt,
      updatedAt: existingRole.updatedAt,
      deletedAt: new Date(),
    });
    roleRepository.getRoleById.mockResolvedValue(alreadyDeletedRole);

    await expect(useCase.execute('role-id')).rejects.toThrow(GoneException);
    expect(roleRepository.deleteRole).not.toHaveBeenCalled();
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    roleRepository.getRoleById.mockResolvedValue(existingRole);
    roleRepository.deleteRole.mockRejectedValue(new Error('connection lost'));

    await expect(useCase.execute('role-id')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
