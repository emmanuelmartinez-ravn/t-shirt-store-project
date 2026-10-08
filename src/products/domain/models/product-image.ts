import { randomUUID } from 'node:crypto';

export class ProductImage {
  readonly id: string;
  readonly imagePath: string;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  readonly productId: string;
  readonly variantId: string | null;

  private constructor(props: {
    id: string;
    imagePath: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    productId: string;
    variantId: string | null;
  }) {
    this.id = props.id;
    this.imagePath = props.imagePath;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
    this.productId = props.productId;
    this.variantId = props.variantId;
  }

  static create(props: { imagePath: string; productId: string }): ProductImage {
    const now = new Date();

    return new ProductImage({
      id: randomUUID(),
      imagePath: props.imagePath,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      productId: props.productId,
      variantId: null,
    });
  }

  static restore(props: {
    id: string;
    imagePath: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    productId: string;
    variantId: string | null;
  }): ProductImage {
    return new ProductImage(props);
  }
}
