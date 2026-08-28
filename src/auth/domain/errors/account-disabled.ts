export class AccountDisabledError extends Error {
  constructor() {
    super('Account is disabled');
    this.name = 'AccountDisabledError';
  }
}
