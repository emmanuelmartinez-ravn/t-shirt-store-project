export class PromoNotFoundError extends Error {
  constructor(id: string) {
    super(`Promo "${id}" not found`);
    this.name = 'PromoNotFoundError';
  }
}
