export class IncorrectPasswordError extends Error {
  constructor(id: string) {
    super(`Old password does not match for user "${id}"`);
    this.name = 'IncorrectPasswordError';
  }
}
