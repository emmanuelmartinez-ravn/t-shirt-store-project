import { randomUUID } from 'node:crypto';

export class LikedProductVariant {
  readonly id: string;
  readonly userId: string;
  readonly productVariantId: string;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  constructor(props: {
    id: string;
    userId: string;
    productVariantId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.productVariantId = props.productVariantId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
  }

  static create(props: {
    userId: string;
    productVariantId: string;
  }): LikedProductVariant {
    const now = new Date();

    return new LikedProductVariant({
      id: randomUUID(),
      userId: props.userId,
      productVariantId: props.productVariantId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static restore(props: {
    id: string;
    userId: string;
    productVariantId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): LikedProductVariant {
    return new LikedProductVariant(props);
  }
}
