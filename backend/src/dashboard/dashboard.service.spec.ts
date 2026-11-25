import { collectionRate, lastMonths } from './dashboard.service';

describe('dashboard helpers', () => {
  it('lists the last months oldest first, across a year boundary', () => {
    expect(lastMonths(4, new Date('2026-02-15T10:00:00Z'))).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('returns exactly the requested number of months', () => {
    expect(lastMonths(6)).toHaveLength(6);
  });

  it('computes the collection rate with one decimal and no divide-by-zero', () => {
    expect(collectionRate(750, 250)).toBe(75);
    expect(collectionRate(1, 2)).toBe(33.3);
    expect(collectionRate(0, 0)).toBe(0);
  });
});
