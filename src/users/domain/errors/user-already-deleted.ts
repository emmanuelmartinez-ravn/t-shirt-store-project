export class UserAlreadyDeletedError extends Error {
  constructor(id: string) {
    super(`User "${id}" already deleted`);
    this.name = 'UserAlreadyDeletedError';
  }
}
