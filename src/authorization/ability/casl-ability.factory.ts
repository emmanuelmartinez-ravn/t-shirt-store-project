import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { Action } from './action.enum';

export type AppSubjects = 'Role' | 'Category' | 'Product' | 'all';
export type AppAbility = MongoAbility<[Action, AppSubjects]>;

const MANAGER_ROLE_NAME = 'manager';

@Injectable()
export class CaslAbilityFactory {
  createForUser(roleName: string): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (roleName === MANAGER_ROLE_NAME) {
      can(Action.Manage, 'Role');
      can(Action.Manage, 'Category');
      can(Action.Manage, 'Product');
    }

    return build();
  }
}
