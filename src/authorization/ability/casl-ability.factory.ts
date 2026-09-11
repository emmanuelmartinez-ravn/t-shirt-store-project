import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { Action } from './action.enum';

export type AppSubjects =
  'Role' | 'User' | 'Category' | 'Product' | 'Promo' | 'all';
export type AppAbility = MongoAbility<[Action, AppSubjects]>;

const MANAGER_ROLE_NAME = 'manager';
const CLIENT_ROLE_NAME = 'client';

@Injectable()
export class CaslAbilityFactory {
  createForUser(roleName: string): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (roleName === MANAGER_ROLE_NAME) {
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

      can(Action.Create, 'Promo');
      can(Action.Read, 'Promo');
      can(Action.Update, 'Promo');
      can(Action.Delete, 'Promo');
    }

    if (roleName === CLIENT_ROLE_NAME) {
      can(Action.Read, 'Category');
      can(Action.Read, 'Product');
      can(Action.Read, 'Promo');
    }

    return build();
  }
}
