export class CartNotFoundError extends Error {
  constructor(userId: string) {
    super(`Cart for user "${userId}" not found`);
    this.name = 'CartNotFoundError';
  }
}
