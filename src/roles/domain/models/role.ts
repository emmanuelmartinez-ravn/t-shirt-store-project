import { randomUUID } from 'node:crypto';

export class Role {
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

  static create(props: { name: string }): Role {
    const now = new Date();

    return new Role({
      id: randomUUID(),
      name: props.name,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static update(role: Role, props: { name: string }): Role {
    const now = new Date();

    return new Role({
      id: role.id,
      name: props.name,
      createdAt: role.createdAt,
      updatedAt: now,
      deletedAt: role.deletedAt,
    });
  }

  static delete(role: Role): Role {
    const now = new Date();

    return new Role({
      id: role.id,
      name: role.name,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      deletedAt: now,
    });
  }

  static restore(props: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): Role {
    return new Role(props);
  }
}
