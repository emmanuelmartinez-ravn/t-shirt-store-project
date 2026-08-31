export class InvalidResetTokenError extends Error {
  constructor() {
    super('Password reset token is invalid or expired');
    this.name = 'InvalidResetTokenError';
  }
}
