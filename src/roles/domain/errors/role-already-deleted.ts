export class RoleAlreadyDeletedError extends Error {
  constructor(id: string) {
    super(`Role "${id}" is already deleted`);
    this.name = 'RoleAlreadyDeletedError';
  }
}
