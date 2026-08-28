import { Role } from '../../domain/models/role';
import { CreateRoleUseCase } from '../../application/use-cases/create-role.use-case';
import { DeleteRoleUseCase } from '../../application/use-cases/delete-role.use-case';
import { GetAllRolesUseCase } from '../../application/use-cases/get-all-roles.use-case';
import { UpdateRoleUseCase } from '../../application/use-cases/update-role.use-case';
import { RolesResponseMapper } from '../mappers/roles-response.mapper';
import { RolesController } from './roles.controller';

describe('RolesController', () => {
  let controller: RolesController;
  let createRoleUseCase: jest.Mocked<CreateRoleUseCase>;
  let getAllRolesUseCase: jest.Mocked<GetAllRolesUseCase>;
  let updateRoleUseCase: jest.Mocked<UpdateRoleUseCase>;
  let deleteRoleUseCase: jest.Mocked<DeleteRoleUseCase>;

  beforeEach(() => {
    createRoleUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateRoleUseCase>;
    getAllRolesUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetAllRolesUseCase>;
    updateRoleUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateRoleUseCase>;
    deleteRoleUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeleteRoleUseCase>;

    controller = new RolesController(
      createRoleUseCase,
      getAllRolesUseCase,
      updateRoleUseCase,
      deleteRoleUseCase,
    );
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createRole', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      const role = Role.restore({
        id: 'role-id',
        name: 'client',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      createRoleUseCase.execute.mockResolvedValue(role);

      const result = await controller.createRole({ name: 'client' });

      expect(createRoleUseCase.execute).toHaveBeenCalledWith('client');
      expect(result).toEqual(RolesResponseMapper.toResponse(role));
    });
  });

  describe('getAllRoles', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      const role = Role.restore({
        id: 'role-id',
        name: 'client',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      getAllRolesUseCase.execute.mockResolvedValue([role]);

      const result = await controller.getAllRoles();

      expect(getAllRolesUseCase.execute).toHaveBeenCalled();
      expect(result).toEqual([RolesResponseMapper.toResponse(role)]);
    });
  });

  describe('updateRole', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      const role = Role.restore({
        id: 'role-id',
        name: 'business',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      updateRoleUseCase.execute.mockResolvedValue(role);

      const result = await controller.updateRole('role-id', {
        name: 'business',
      });

      expect(updateRoleUseCase.execute).toHaveBeenCalledWith(
        'role-id',
        'business',
      );
      expect(result).toEqual(RolesResponseMapper.toResponse(role));
    });
  });

  describe('deleteRole', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      const role = Role.restore({
        id: 'role-id',
        name: 'client',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      });
      deleteRoleUseCase.execute.mockResolvedValue(role);

      const result = await controller.deleteRole('role-id');

      expect(deleteRoleUseCase.execute).toHaveBeenCalledWith('role-id');
      expect(result).toEqual(RolesResponseMapper.toResponse(role));
    });
  });
});
