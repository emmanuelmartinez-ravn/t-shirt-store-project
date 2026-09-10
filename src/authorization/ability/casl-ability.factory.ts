import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { Action } from './action.enum';

export type AppSubjects = 'Role' | 'User' | 'Category' | 'Product' | 'all';
export type AppAbility = MongoAbility<[Action, AppSubjects]>;

const MANAGER_ROLE_NAME = 'manager';
const CLIENT_ROLE_NAME = 'client';

@Injectable()
export class CaslAbilityFactory {
  createForUser(roleName: string): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (roleName === MANAGER_ROLE_NAME) {
      can(Action.Manage, 'Role');
      can(Action.Manage, 'User');
      can(Action.Manage, 'Category');
      can(Action.Manage, 'Product');

      can(Action.Create, 'Role');
      can(Action.Read, 'Role');
      can(Action.Update, 'Role');
      can(Action.Delete, 'Role');

      can(Action.Create, 'User');
      can(Action.Read, 'User');
      can(Action.Update, 'User');
      can(Action.Delete, 'User');

      can(Action.Create, 'Category');
      can(Action.Read, 'Category');
      can(Action.Update, 'Category');
      can(Action.Delete, 'Category');

      can(Action.Create, 'Product');
      can(Action.Read, 'Product');
      can(Action.Update, 'Product');
      can(Action.Delete, 'Product');
    }

    if (roleName === CLIENT_ROLE_NAME) {
      can(Action.Read, 'Category');
      can(Action.Read, 'Product');
    }

    return build();
  }
}
