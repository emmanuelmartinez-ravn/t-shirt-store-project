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

    it('grants manage permission on Category to a manager', () => {
      const ability = factory.createForUser('manager');

      expect(ability.can(Action.Manage, 'Category')).toBe(true);
    });

    it('denies manage permission on Category to a non-manager', () => {
      const ability = factory.createForUser('client');

      expect(ability.can(Action.Manage, 'Category')).toBe(false);
    });

    it('grants manage permission on Product to a manager', () => {
      const ability = factory.createForUser('manager');

      expect(ability.can(Action.Manage, 'Product')).toBe(true);
    });

    it('denies manage permission on Product to a non-manager', () => {
      const ability = factory.createForUser('client');

      expect(ability.can(Action.Manage, 'Product')).toBe(false);
    });
  });
});
