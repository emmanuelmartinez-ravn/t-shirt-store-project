import { randomUUID } from 'node:crypto';

export class CartItem {
  readonly id: string;
  quantity: number;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  readonly cartId: string;
  readonly productVariantId: string;

  constructor(props: {
    id: string;
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    cartId: string;
    productVariantId: string;
  }) {
    this.id = props.id;
    this.quantity = props.quantity;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
    this.cartId = props.cartId;
    this.productVariantId = props.productVariantId;
  }

  static create(props: {
    cartId: string;
    productVariantId: string;
    quantity: number;
  }): CartItem {
    const now = new Date();

    return new CartItem({
      id: randomUUID(),
      quantity: props.quantity,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      cartId: props.cartId,
      productVariantId: props.productVariantId,
    });
  }

  static restore(props: {
    id: string;
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    cartId: string;
    productVariantId: string;
  }): CartItem {
    return new CartItem(props);
  }
}
