import { randomUUID } from 'node:crypto';

const MILLISECONDS_PER_MINUTE = 60_000;

export class RefreshToken {
  readonly id: string;
  readonly jti: string;
  readonly expiresAt: Date;
  revokedAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  readonly userId: string;

  constructor(props: {
    id: string;
    jti: string;
    expiresAt: Date;
    revokedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    userId: string;
  }) {
    this.id = props.id;
    this.jti = props.jti;
    this.expiresAt = props.expiresAt;
    this.revokedAt = props.revokedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
    this.userId = props.userId;
  }

  static create(props: { userId: string; ttlMinutes: number }): RefreshToken {
    const now = new Date();

    return new RefreshToken({
      id: randomUUID(),
      jti: randomUUID(),
      expiresAt: new Date(
        now.getTime() + props.ttlMinutes * MILLISECONDS_PER_MINUTE,
      ),
      revokedAt: null,
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
    revokedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    userId: string;
  }): RefreshToken {
    return new RefreshToken(props);
  }

  static revoke(token: RefreshToken): RefreshToken {
    return new RefreshToken({
      id: token.id,
      jti: token.jti,
      expiresAt: token.expiresAt,
      revokedAt: new Date(),
      createdAt: token.createdAt,
      updatedAt: new Date(),
      deletedAt: token.deletedAt,
      userId: token.userId,
    });
  }

  isExpired(): boolean {
    return this.expiresAt.getTime() < Date.now();
  }

  isRevoked(): boolean {
    return this.revokedAt !== null;
  }
}
