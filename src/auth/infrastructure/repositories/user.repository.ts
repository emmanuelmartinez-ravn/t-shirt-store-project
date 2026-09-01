import { User } from '../../domain/models/user';

export abstract class UserRepository {
  abstract createUser(user: User): Promise<User>;
  abstract getUserById(id: string): Promise<User | null>;
  abstract getUserByEmail(email: string): Promise<User | null>;
  abstract activateUser(user: User): Promise<User>;
  abstract promoteUser(user: User): Promise<User>;
  abstract updatePassword(user: User): Promise<User>;
  abstract updateProfile(user: User): Promise<User>;
  abstract setDisabled(user: User): Promise<User>;
  abstract deleteUser(user: User): Promise<User>;
  abstract anonymizeUser(user: User): Promise<User>;
}
