import { PaginationMapper } from './pagination.mapper';

describe('PaginationMapper', () => {
  describe('buildMeta', () => {
    it('rounds totalPages up when total is not evenly divisible by limit', () => {
      const meta = PaginationMapper.buildMeta(1, 20, 45);

      expect(meta).toEqual({
        page: 1,
        limit: 20,
        total: 45,
        totalPages: 3,
      });
    });

    it('computes totalPages exactly when total is evenly divisible by limit', () => {
      const meta = PaginationMapper.buildMeta(1, 20, 100);

      expect(meta).toEqual({
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5,
      });
    });

    it('returns totalPages of zero when there are no items', () => {
      const meta = PaginationMapper.buildMeta(1, 20, 0);

      expect(meta).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });
  });
});
