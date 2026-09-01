export class UserNotDeletedError extends Error {
  constructor(id: string) {
    super(`User "${id}" must be deleted before it can be anonymized`);
    this.name = 'UserNotDeletedError';
  }
}
