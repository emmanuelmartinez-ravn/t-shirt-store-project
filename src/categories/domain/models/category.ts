import { randomUUID } from 'node:crypto';

export class Category {
  readonly id: string;
  name: string;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  constructor(props: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
  }

  static create(props: { name: string }): Category {
    const now = new Date();

    return new Category({
      id: randomUUID(),
      name: props.name,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static update(category: Category, props: { name: string }): Category {
    const now = new Date();

    return new Category({
      id: category.id,
      name: props.name,
      createdAt: category.createdAt,
      updatedAt: now,
      deletedAt: category.deletedAt,
    });
  }

  static delete(category: Category): Category {
    const now = new Date();

    return new Category({
      id: category.id,
      name: category.name,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      deletedAt: now,
    });
  }

  static restore(props: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): Category {
    return new Category(props);
  }
}
