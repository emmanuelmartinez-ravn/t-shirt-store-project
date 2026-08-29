import { randomUUID } from 'node:crypto';

export class Product {
  readonly id: string;
  name: string;
  description: string | null;
  disabled: boolean;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  categoryId: string;

  constructor(props: {
    id: string;
    name: string;
    description: string | null;
    disabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    categoryId: string;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.disabled = props.disabled;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
    this.categoryId = props.categoryId;
  }

  static create(props: {
    name: string;
    description: string | null;
    categoryId: string;
  }): Product {
    const now = new Date();

    return new Product({
      id: randomUUID(),
      name: props.name,
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
      description: product.description,
      disabled: product.disabled,
      createdAt: product.createdAt,
      updatedAt: now,
      deletedAt: now,
      categoryId: product.categoryId,
    });
  }

  static restore(props: {
    id: string;
    name: string;
    description: string | null;
    disabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    categoryId: string;
  }): Product {
    return new Product(props);
  }
}
