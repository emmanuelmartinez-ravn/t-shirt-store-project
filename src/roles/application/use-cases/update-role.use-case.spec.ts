import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { RoleAlreadyExistsError } from '../../domain/errors/role-already-exists';
import { Role } from '../../domain/models/role';
import { RoleRepository } from '../../infrastructure/repositories/role.repository';
import { UpdateRoleUseCase } from './update-role.use-case';

describe('UpdateRoleUseCase', () => {
  let useCase: UpdateRoleUseCase;
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

    useCase = new UpdateRoleUseCase(roleRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('updates and returns the role', async () => {
    const persistedRole = Role.restore({
      id: 'role-id',
      name: 'business',
      createdAt: existingRole.createdAt,
      updatedAt: new Date(),
      deletedAt: null,
    });
    roleRepository.getRoleById.mockResolvedValue(existingRole);
    roleRepository.updateRole.mockResolvedValue(persistedRole);

    const result = await useCase.execute('role-id', 'business');

    expect(roleRepository.updateRole).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'role-id', name: 'business' }),
    );
    expect(result).toBe(persistedRole);
  });

  it('translates a missing role into a NotFoundException', async () => {
    roleRepository.getRoleById.mockResolvedValue(null);

    await expect(useCase.execute('role-id', 'business')).rejects.toThrow(
      NotFoundException,
    );
    expect(roleRepository.updateRole).not.toHaveBeenCalled();
  });

  it('translates RoleAlreadyExistsError into a ConflictException', async () => {
    roleRepository.getRoleById.mockResolvedValue(existingRole);
    roleRepository.updateRole.mockRejectedValue(
      new RoleAlreadyExistsError('business'),
    );

    await expect(useCase.execute('role-id', 'business')).rejects.toThrow(
      ConflictException,
    );
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    roleRepository.getRoleById.mockResolvedValue(existingRole);
    roleRepository.updateRole.mockRejectedValue(new Error('connection lost'));

    await expect(useCase.execute('role-id', 'business')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
