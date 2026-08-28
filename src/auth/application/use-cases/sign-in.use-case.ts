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
        throw new InvalidCredentialsError();
      }

      const passwordMatches = await bcrypt.compare(
        props.password,
        user.hashedPassword,
      );

      if (!passwordMatches) {
        throw new InvalidCredentialsError();
      }

      if (user.disabled) {
        throw new AccountDisabledError();
      }

      const role = await this.roleRepository.getRoleById(user.roleId);

      if (!role) {
        throw new Error(`Role "${user.roleId}" not found for user ${user.id}`);
      }

      this.logger.log(`Signed in user ${user.email}`);
      return await this.issueAuthTokensService.issueTokens(user, role.name);
    } catch (error) {
      this.logger.error(`Failed to sign in user ${props.email}`, error);

      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException({
          error: 'Invalid email or password',
          details: [],
        });
      }

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
