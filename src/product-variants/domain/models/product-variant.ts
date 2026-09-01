import { randomUUID } from 'node:crypto';

const SKU_ABBREVIATION_LENGTH = 3;

export class ProductVariant {
  readonly id: string;
  readonly sku: string;
  price: number;
  stock: number;
  disabled: boolean;
  attributes: Record<string, string>;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  productId: string;

  constructor(props: {
    id: string;
    sku: string;
    price: number;
    stock: number;
    disabled: boolean;
    attributes: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    productId: string;
  }) {
    this.id = props.id;
    this.sku = props.sku;
    this.price = props.price;
    this.stock = props.stock;
    this.disabled = props.disabled;
    this.attributes = props.attributes;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
    this.productId = props.productId;
  }

  static create(props: {
    sku: string;
    price: number;
    stock: number;
    attributes: Record<string, string>;
    productId: string;
  }): ProductVariant {
    const now = new Date();

    return new ProductVariant({
      id: randomUUID(),
      sku: props.sku,
      price: props.price,
      stock: props.stock,
      disabled: false,
      attributes: props.attributes,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      productId: props.productId,
    });
  }

  static restore(props: {
    id: string;
    sku: string;
    price: number;
    stock: number;
    disabled: boolean;
    attributes: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    productId: string;
  }): ProductVariant {
    return new ProductVariant(props);
  }

  static update(
    variant: ProductVariant,
    props: { price: number; stock: number },
  ): ProductVariant {
    const now = new Date();

    return new ProductVariant({
      id: variant.id,
      sku: variant.sku,
      price: props.price,
      stock: props.stock,
      disabled: variant.disabled,
      attributes: variant.attributes,
      createdAt: variant.createdAt,
      updatedAt: now,
      deletedAt: variant.deletedAt,
      productId: variant.productId,
    });
  }

  static generateSku(
    productCode: string,
    attributes: Record<string, string>,
  ): string {
    const abbreviations = Object.values(attributes).map((value) =>
      value.trim().slice(0, SKU_ABBREVIATION_LENGTH).toUpperCase(),
    );
    return [productCode, ...abbreviations].join('-');
  }
}
