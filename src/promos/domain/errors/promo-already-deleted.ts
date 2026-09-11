export class PromoAlreadyDeletedError extends Error {
  constructor(id: string) {
    super(`Promo "${id}" is already deleted`);
    this.name = 'PromoAlreadyDeletedError';
  }
}
