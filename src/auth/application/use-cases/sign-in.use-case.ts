import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RoleRepository } from '../../../roles/infrastructure/repositories/role.repository';
import { AccountDisabledError } from '../../domain/errors/account-disabled';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import {
  AuthTokens,
  IssueAuthTokensService,
} from '../services/issue-auth-tokens.service';

@Injectable()
export class SignInUseCase {
  private readonly logger: Logger = new Logger(SignInUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly issueAuthTokensService: IssueAuthTokensService,
  ) {}

  async execute(props: {
    email: string;
    password: string;
  }): Promise<AuthTokens> {
    try {
      const user = await this.userRepository.getUserByEmail(props.email);

      if (!user) {
        this.logger.warn(
          `Failed to sign in user ${props.email}: email not found`,
        );
        throw new InvalidCredentialsError();
      }

      const passwordMatches = await bcrypt.compare(
        props.password,
        user.hashedPassword,
      );

      if (!passwordMatches) {
        this.logger.warn(
          `Failed to sign in user ${props.email}: password mismatch`,
        );
        throw new InvalidCredentialsError();
      }

      if (user.disabled) {
        throw new AccountDisabledError();
      }

      const role = await this.roleRepository.getRoleById(user.roleId);

      if (!role) {
        throw new Error(`Role "${user.roleId}" not found for user ${user.id}`);
      }

      const tokens = await this.issueAuthTokensService.issueTokens(
        user,
        role.name,
      );
      this.logger.log(`Signed in user ${user.email}`);
      return tokens;
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException({
          error: 'Invalid email or password',
          details: [],
        });
      }

      this.logger.error(`Failed to sign in user ${props.email}`, error);

      if (error instanceof AccountDisabledError) {
        throw new ForbiddenException({
          error: 'Account is disabled',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
