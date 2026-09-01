import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { RoleAlreadyExistsError } from '../../domain/errors/role-already-exists';
import { Role } from '../../domain/models/role';
import { RoleRepository } from '../../infrastructure/repositories/role.repository';
import { CreateRoleUseCase } from './create-role.use-case';

describe('CreateRoleUseCase', () => {
  let useCase: CreateRoleUseCase;
  let roleRepository: jest.Mocked<RoleRepository>;

  beforeEach(() => {
    roleRepository = {
      createRole: jest.fn(),
      getAllRoles: jest.fn(),
      getRoleByName: jest.fn(),
      getRoleById: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
    };

    useCase = new CreateRoleUseCase(roleRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('creates and returns the role', async () => {
    const persistedRole = Role.restore({
      id: 'role-id',
      name: 'client',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    roleRepository.createRole.mockResolvedValue(persistedRole);

    const result = await useCase.execute('client');

    expect(roleRepository.createRole).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'client' }),
    );
    expect(result).toBe(persistedRole);
  });

  it('translates RoleAlreadyExistsError into a ConflictException', async () => {
    roleRepository.createRole.mockRejectedValue(
      new RoleAlreadyExistsError('client'),
    );

    await expect(useCase.execute('client')).rejects.toThrow(ConflictException);
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    roleRepository.createRole.mockRejectedValue(new Error('connection lost'));

    await expect(useCase.execute('client')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
