export class RoleNotFoundError extends Error {
  constructor(id: string) {
    super(`Role "${id}" not found`);
    this.name = 'RoleNotFoundError';
  }
}
