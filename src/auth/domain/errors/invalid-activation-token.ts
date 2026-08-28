export class InvalidActivationTokenError extends Error {
  constructor() {
    super('Activation token is invalid or expired');
    this.name = 'InvalidActivationTokenError';
  }
}
