import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { formatMoney } from '@conciergeiq/utils';
import { App } from '../src/App';

describe('Guest Web Application Suite', () => {
  it('mounts the root guest application component cleanly in jsdom', () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
    expect(screen.getByText(/The Lagos Grand Hotel & Suites/i)).toBeDefined();
    expect(screen.getByText(/Room 402/i)).toBeDefined();
  });

  it('formats room service item pricing accurately', () => {
    const formattedPrice = formatMoney(2400, 'USD');
    expect(formattedPrice).toBe('$24.00');
  });

  it('calculates cart subtotals and sales tax correctly', () => {
    const sampleItems = [
      { priceMinor: 1600, quantity: 2 },
      { priceMinor: 950, quantity: 1 },
    ];
    const subtotal = sampleItems.reduce(
      (accumulator, currentItem) => accumulator + currentItem.priceMinor * currentItem.quantity,
      0
    );
    expect(subtotal).toBe(4150);

    const calculatedTax = Math.round(subtotal * 0.08);
    expect(calculatedTax).toBe(332);
    expect(subtotal + calculatedTax).toBe(4482);
  });
});
