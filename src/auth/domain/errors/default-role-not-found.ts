export class DefaultRoleNotFoundError extends Error {
  constructor(roleName: string) {
    super(`Default role "${roleName}" not found`);
    this.name = 'DefaultRoleNotFoundError';
  }
}
