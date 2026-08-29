export class UserAlreadyManagerError extends Error {
  constructor(id: string) {
    super(`User "${id}" is already a manager`);
    this.name = 'UserAlreadyManagerError';
  }
}
