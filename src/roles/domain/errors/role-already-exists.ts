export class RoleAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`Role "${name}" already exists`);
    this.name = 'RoleAlreadyExistsError';
  }
}
