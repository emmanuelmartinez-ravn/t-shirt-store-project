import { Action } from './action.enum';
import { CaslAbilityFactory } from './casl-ability.factory';

describe('CaslAbilityFactory', () => {
  let factory: CaslAbilityFactory;

  beforeEach(() => {
    factory = new CaslAbilityFactory();
  });

  it('is defined', () => {
    expect(factory).toBeDefined();
  });

  describe('createForUser', () => {
    it('grants manage permission on Role to a manager', () => {
      const ability = factory.createForUser('manager');

      expect(ability.can(Action.Manage, 'Role')).toBe(true);
    });

    it('denies manage permission on Role to a non-manager', () => {
      const ability = factory.createForUser('client');

      expect(ability.can(Action.Manage, 'Role')).toBe(false);
    });

    it('grants manage permission on User to a manager', () => {
      const ability = factory.createForUser('manager');

      expect(ability.can(Action.Manage, 'User')).toBe(true);
    });

    it('denies manage permission on User to a non-manager', () => {
      const ability = factory.createForUser('client');

      expect(ability.can(Action.Manage, 'User')).toBe(false);
    });
  });
});
