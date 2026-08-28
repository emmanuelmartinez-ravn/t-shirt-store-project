import { randomUUID } from 'node:crypto';

const MILLISECONDS_PER_MINUTE = 60_000;

export class AccountActivationToken {
  readonly id: string;
  readonly jti: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  readonly userId: string;

  constructor(props: {
    id: string;
    jti: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    userId: string;
  }) {
    this.id = props.id;
    this.jti = props.jti;
    this.expiresAt = props.expiresAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
    this.userId = props.userId;
  }

  static create(props: {
    userId: string;
    ttlMinutes: number;
  }): AccountActivationToken {
    const now = new Date();

    return new AccountActivationToken({
      id: randomUUID(),
      jti: randomUUID(),
      expiresAt: new Date(
        now.getTime() + props.ttlMinutes * MILLISECONDS_PER_MINUTE,
      ),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      userId: props.userId,
    });
  }

  static restore(props: {
    id: string;
    jti: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    userId: string;
  }): AccountActivationToken {
    return new AccountActivationToken(props);
  }

  static consume(token: AccountActivationToken): AccountActivationToken {
    return new AccountActivationToken({
      id: token.id,
      jti: token.jti,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      updatedAt: new Date(),
      deletedAt: new Date(),
      userId: token.userId,
    });
  }

  isExpired(): boolean {
    return this.expiresAt.getTime() < Date.now();
  }
}
