import { User } from '../../domain/models/user';
import { UserResponseDto } from '../dto/user-response';

export class UserResponseMapper {
  static toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      disabled: user.disabled,
      createdAt: user.createdAt,
    };
  }
}
