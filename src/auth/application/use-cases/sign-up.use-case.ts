import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RoleRepository } from '../../../roles/infrastructure/repositories/role.repository';
import { EmailQueueService } from '../../../mail/services/email-queue.service';
import { CartRepository } from '../../../carts/infrastructure/repositories/cart.repository';
import { Cart } from '../../../carts/domain/models/cart';
import { getAccountActivationTokenTtlMinutes } from '../config/account-activation-token-ttl';
import { DefaultRoleNotFoundError } from '../../domain/errors/default-role-not-found';
import { UserAlreadyExistsError } from '../../domain/errors/user-already-exists';
import { AccountActivationToken } from '../../domain/models/account-activation-token';
import { User } from '../../domain/models/user';
import { AccountActivationTokenRepository } from '../../infrastructure/repositories/account-activation-token.repository';
import { UserRepository } from '../../infrastructure/repositories/user.repository';

const DEFAULT_SIGN_UP_ROLE_NAME = 'client';
const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class SignUpUseCase {
  private readonly logger: Logger = new Logger(SignUpUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly accountActivationTokenRepository: AccountActivationTokenRepository,
    private readonly roleRepository: RoleRepository,
    private readonly emailQueueService: EmailQueueService,
    private readonly cartRepository: CartRepository,
  ) {}

  async execute(props: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<User> {
    try {
      const role = await this.roleRepository.getRoleByName(
        DEFAULT_SIGN_UP_ROLE_NAME,
      );

      if (!role) {
        throw new DefaultRoleNotFoundError(DEFAULT_SIGN_UP_ROLE_NAME);
      }

      const hashedPassword = await bcrypt.hash(
        props.password,
        PASSWORD_SALT_ROUNDS,
      );

      const user = User.create({
        firstName: props.firstName,
        lastName: props.lastName,
        email: props.email,
        hashedPassword,
        roleId: role.id,
      });
      const createdUser = await this.userRepository.createUser(user);

      const cart = Cart.create({ userId: createdUser.id });
      await this.cartRepository.createCart(cart);

      const ttlMinutes = getAccountActivationTokenTtlMinutes();
      const activationToken = AccountActivationToken.create({
        userId: createdUser.id,
        ttlMinutes,
      });
      await this.accountActivationTokenRepository.createToken(activationToken);

      try {
        await this.emailQueueService.enqueueAccountVerificationEmail({
          to: createdUser.email,
          token: activationToken.jti,
        });
      } catch (emailError) {
        this.logger.error(
          `Failed to enqueue verification email for ${createdUser.email}`,
          emailError,
        );
      }

      this.logger.log(`Signed up user ${createdUser.email}`);
      return createdUser;
    } catch (error) {
      this.logger.error(`Failed to sign up user ${props.email}`, error);

      if (error instanceof DefaultRoleNotFoundError) {
        throw new InternalServerErrorException({
          error: 'Default role not found',
          details: [],
        });
      }

      if (error instanceof UserAlreadyExistsError) {
        throw new ConflictException({
          error: 'User already exists',
          details: ['email must be unique'],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
