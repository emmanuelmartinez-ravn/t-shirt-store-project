export class ManagerRoleNotFoundError extends Error {
  constructor(roleName: string) {
    super(`Manager role "${roleName}" not found`);
    this.name = 'ManagerRoleNotFoundError';
  }
}
