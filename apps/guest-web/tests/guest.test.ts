import { describe, it, expect } from 'vitest';
import { formatMoney } from '@conciergeiq/utils';

describe('Guest Web Application Suite', () => {
  it('formats room service item pricing accurately', () => {
    const formatted = formatMoney(2400, 'USD');
    expect(formatted).toBe('$24.00');
  });

  it('calculates cart subtotals and sales tax correctly', () => {
    const items = [
      { priceMinor: 1600, quantity: 2 },
      { priceMinor: 950, quantity: 1 },
    ];
    const subtotal = items.reduce((acc, curr) => acc + curr.priceMinor * curr.quantity, 0);
    expect(subtotal).toBe(4150);

    const tax = Math.round(subtotal * 0.08);
    expect(tax).toBe(332);
    expect(subtotal + tax).toBe(4482);
  });
});
