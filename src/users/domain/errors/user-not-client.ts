export class UserNotClientError extends Error {
  constructor(id: string) {
    super(`User "${id}" must be a client to be promoted`);
    this.name = 'UserNotClientError';
  }
}
