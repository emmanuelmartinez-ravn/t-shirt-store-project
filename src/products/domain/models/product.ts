import { randomUUID } from 'node:crypto';
import { ProductVariant } from '../../../product-variants/domain/models/product-variant';

const PRODUCT_CODE_PREFIX = 'TS-';
const PRODUCT_CODE_NUMBER_LENGTH = 6;

export const PRODUCT_FIELDS = ['productVariants'] as const;
export type ProductField = (typeof PRODUCT_FIELDS)[number];

export class Product {
  readonly id: string;
  name: string;
  readonly code: string;
  description: string | null;
  disabled: boolean;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  categoryId: string;
  productVariants?: ProductVariant[];

  constructor(props: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    disabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    categoryId: string;
    productVariants?: ProductVariant[];
  }) {
    this.id = props.id;
    this.name = props.name;
    this.code = props.code;
    this.description = props.description;
    this.disabled = props.disabled;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
    this.categoryId = props.categoryId;
    this.productVariants = props.productVariants;
  }

  static create(props: {
    name: string;
    code: string;
    description: string | null;
    categoryId: string;
  }): Product {
    const now = new Date();

    return new Product({
      id: randomUUID(),
      name: props.name,
      code: props.code,
      description: props.description,
      disabled: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      categoryId: props.categoryId,
    });
  }

  static update(
    product: Product,
    props: { name: string; description: string | null; categoryId: string },
  ): Product {
    const now = new Date();

    return new Product({
      id: product.id,
      name: props.name,
      code: product.code,
      description: props.description,
      disabled: product.disabled,
      createdAt: product.createdAt,
      updatedAt: now,
      deletedAt: product.deletedAt,
      categoryId: props.categoryId,
    });
  }

  static delete(product: Product): Product {
    const now = new Date();

    return new Product({
      id: product.id,
      name: product.name,
      code: product.code,
      description: product.description,
      disabled: product.disabled,
      createdAt: product.createdAt,
      updatedAt: now,
      deletedAt: now,
      categoryId: product.categoryId,
    });
  }

  static setDisabled(product: Product, disabled: boolean): Product {
    const now = new Date();

    return new Product({
      id: product.id,
      name: product.name,
      code: product.code,
      description: product.description,
      disabled,
      createdAt: product.createdAt,
      updatedAt: now,
      deletedAt: product.deletedAt,
      categoryId: product.categoryId,
    });
  }

  static restore(props: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    disabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    categoryId: string;
    productVariants?: ProductVariant[];
  }): Product {
    return new Product(props);
  }

  static generateNextCode(lastCode: string | null): string {
    const lastNumber = lastCode
      ? Number(lastCode.slice(PRODUCT_CODE_PREFIX.length))
      : 0;
    const nextNumber = lastNumber + 1;
    return `${PRODUCT_CODE_PREFIX}${String(nextNumber).padStart(PRODUCT_CODE_NUMBER_LENGTH, '0')}`;
  }
}
