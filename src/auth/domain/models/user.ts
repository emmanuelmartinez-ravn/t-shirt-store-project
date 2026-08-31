import { randomUUID } from 'node:crypto';

export class User {
  readonly id: string;
  firstName: string;
  lastName: string;
  email: string;
  hashedPassword: string;
  avatar: string;
  disabled: boolean;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  roleId: string;

  constructor(props: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    hashedPassword: string;
    avatar: string;
    disabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    roleId: string;
  }) {
    this.id = props.id;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.email = props.email;
    this.hashedPassword = props.hashedPassword;
    this.avatar = props.avatar;
    this.disabled = props.disabled;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
    this.roleId = props.roleId;
  }

  static create(props: {
    firstName: string;
    lastName: string;
    email: string;
    hashedPassword: string;
    roleId: string;
  }): User {
    const now = new Date();

    return new User({
      id: randomUUID(),
      firstName: props.firstName,
      lastName: props.lastName,
      email: props.email,
      hashedPassword: props.hashedPassword,
      avatar: '',
      disabled: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      roleId: props.roleId,
    });
  }

  static restore(props: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    hashedPassword: string;
    avatar: string;
    disabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    roleId: string;
  }): User {
    return new User(props);
  }

  static activate(user: User): User {
    return new User({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      hashedPassword: user.hashedPassword,
      avatar: user.avatar,
      disabled: false,
      createdAt: user.createdAt,
      updatedAt: new Date(),
      deletedAt: user.deletedAt,
      roleId: user.roleId,
    });
  }

  static promote(user: User, roleId: string): User {
    return new User({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      hashedPassword: user.hashedPassword,
      avatar: user.avatar,
      disabled: user.disabled,
      createdAt: user.createdAt,
      updatedAt: new Date(),
      deletedAt: user.deletedAt,
      roleId,
    });
  }

  static changePassword(user: User, hashedPassword: string): User {
    return new User({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      hashedPassword,
      avatar: user.avatar,
      disabled: user.disabled,
      createdAt: user.createdAt,
      updatedAt: new Date(),
      deletedAt: user.deletedAt,
      roleId: user.roleId,
    });
  }
}
