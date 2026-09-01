import { randomUUID } from 'node:crypto';

export class Cart {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  constructor(props: {
    id: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
  }

  static create(props: { userId: string }): Cart {
    const now = new Date();

    return new Cart({
      id: randomUUID(),
      userId: props.userId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static restore(props: {
    id: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): Cart {
    return new Cart(props);
  }
}
