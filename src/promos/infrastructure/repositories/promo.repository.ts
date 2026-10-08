import { Promo } from '../../domain/models/promo';

export abstract class PromoRepository {
  abstract createPromo(promo: Promo): Promise<Promo>;
  abstract getAllPromos(): Promise<Promo[]>;
  abstract getPromoById(id: string): Promise<Promo | null>;
  abstract getPromoByCode(code: string): Promise<Promo | null>;
  abstract updatePromo(promo: Promo): Promise<Promo>;
  abstract deletePromo(promo: Promo): Promise<Promo>;
}
