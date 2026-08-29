export class UserDisabledError extends Error {
  constructor(id: string) {
    super(`User "${id}" is disabled`);
    this.name = 'UserDisabledError';
  }
}
