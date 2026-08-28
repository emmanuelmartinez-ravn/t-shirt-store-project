export class UserAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`User "${email}" already exists`);
    this.name = 'UserAlreadyExistsError';
  }
}
