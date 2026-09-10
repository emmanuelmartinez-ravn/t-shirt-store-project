import { Action } from './action.enum';
import { AppSubjects, CaslAbilityFactory } from './casl-ability.factory';

describe('CaslAbilityFactory', () => {
  let factory: CaslAbilityFactory;

  const subjects: AppSubjects[] = ['Role', 'User', 'Category', 'Product'];
  const crudActions = [
    Action.Create,
    Action.Read,
    Action.Update,
    Action.Delete,
  ];

  beforeEach(() => {
    factory = new CaslAbilityFactory();
  });

  it('is defined', () => {
    expect(factory).toBeDefined();
  });

  describe('createForUser', () => {
    it('grants create, read, update, and delete on every subject to a manager', () => {
      const ability = factory.createForUser('manager');

      for (const subject of subjects) {
        for (const action of crudActions) {
          expect(ability.can(action, subject)).toBe(true);
        }
      }
    });

    it('grants read permission on category and product to a client', () => {
      const ability = factory.createForUser('client');

      expect(ability.can(Action.Read, 'Category')).toBe(true);
      expect(ability.can(Action.Read, 'Product')).toBe(true);
    });

    it('denies every action and subject combination to a client beyond reading category and product', () => {
      const ability = factory.createForUser('client');
      const allowedGrants = new Set(['Category:read', 'Product:read']);

      for (const subject of subjects) {
        for (const action of crudActions) {
          if (allowedGrants.has(`${subject}:${action}`)) {
            continue;
          }

          expect(ability.can(action, subject)).toBe(false);
        }
      }
    });

    it('grants no permissions when the role name is unrecognized', () => {
      const ability = factory.createForUser('guest');

      for (const subject of subjects) {
        for (const action of crudActions) {
          expect(ability.can(action, subject)).toBe(false);
        }
      }
    });
  });
});
