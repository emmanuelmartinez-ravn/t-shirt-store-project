import { InternalServerErrorException } from '@nestjs/common';
import { Role } from '../../domain/models/role';
import { RoleRepository } from '../../infrastructure/repositories/role.repository';
import { GetAllRolesUseCase } from './get-all-roles.use-case';

describe('GetAllRolesUseCase', () => {
  let useCase: GetAllRolesUseCase;
  let roleRepository: jest.Mocked<RoleRepository>;

  beforeEach(() => {
    roleRepository = {
      createRole: jest.fn(),
      getAllRoles: jest.fn(),
      getRoleByName: jest.fn(),
      getRoleById: jest.fn(),
      updateRole: jest.fn(),
    };

    useCase = new GetAllRolesUseCase(roleRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('returns all roles', async () => {
    const roles = [
      Role.restore({
        id: 'role-id',
        name: 'client',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }),
    ];
    roleRepository.getAllRoles.mockResolvedValue(roles);

    const result = await useCase.execute();

    expect(result).toBe(roles);
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    roleRepository.getAllRoles.mockRejectedValue(new Error('connection lost'));

    await expect(useCase.execute()).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
