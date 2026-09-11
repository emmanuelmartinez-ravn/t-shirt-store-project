import { randomUUID } from 'node:crypto';

export type PromoDiscountType = 'percentage' | 'fixed';

export class Promo {
  readonly id: string;
  code: string;
  type: PromoDiscountType;
  value: number;
  expiration: Date | null;
  remainUsages: number | null;
  minimumPurchaseAmount: number | null;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  constructor(props: {
    id: string;
    code: string;
    type: PromoDiscountType;
    value: number;
    expiration: Date | null;
    remainUsages: number | null;
    minimumPurchaseAmount: number | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }) {
    this.id = props.id;
    this.code = props.code;
    this.type = props.type;
    this.value = props.value;
    this.expiration = props.expiration;
    this.remainUsages = props.remainUsages;
    this.minimumPurchaseAmount = props.minimumPurchaseAmount;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
  }

  static create(props: {
    code: string;
    type: PromoDiscountType;
    value: number;
    expiration: Date | null;
    remainUsages: number | null;
    minimumPurchaseAmount: number | null;
  }): Promo {
    const now = new Date();

    return new Promo({
      id: randomUUID(),
      code: props.code,
      type: props.type,
      value: props.value,
      expiration: props.expiration,
      remainUsages: props.remainUsages,
      minimumPurchaseAmount: props.minimumPurchaseAmount,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static update(
    promo: Promo,
    props: {
      code: string;
      type: PromoDiscountType;
      value: number;
      expiration: Date | null;
      remainUsages: number | null;
      minimumPurchaseAmount: number | null;
    },
  ): Promo {
    const now = new Date();

    return new Promo({
      id: promo.id,
      code: props.code,
      type: props.type,
      value: props.value,
      expiration: props.expiration,
      remainUsages: props.remainUsages,
      minimumPurchaseAmount: props.minimumPurchaseAmount,
      createdAt: promo.createdAt,
      updatedAt: now,
      deletedAt: promo.deletedAt,
    });
  }

  static delete(promo: Promo): Promo {
    const now = new Date();

    return new Promo({
      id: promo.id,
      code: promo.code,
      type: promo.type,
      value: promo.value,
      expiration: promo.expiration,
      remainUsages: promo.remainUsages,
      minimumPurchaseAmount: promo.minimumPurchaseAmount,
      createdAt: promo.createdAt,
      updatedAt: now,
      deletedAt: now,
    });
  }

  static restore(props: {
    id: string;
    code: string;
    type: PromoDiscountType;
    value: number;
    expiration: Date | null;
    remainUsages: number | null;
    minimumPurchaseAmount: number | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): Promo {
    return new Promo(props);
  }
}
