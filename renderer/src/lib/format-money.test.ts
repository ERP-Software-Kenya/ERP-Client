import { beforeEach, describe, expect, it } from 'vitest';
import {
  configureCurrencyCode,
  formatMoney,
  formatMoneyCompact,
  getCurrencyCode,
  getCurrencySymbol,
} from './format-money';

describe('organization money formatting', () => {
  beforeEach(() => configureCurrencyCode('USD'));

  it('uses the configured organization currency by default', () => {
    configureCurrencyCode('KES');
    expect(getCurrencyCode()).toBe('KES');
    expect(formatMoney(42)).toBe('KSh 42.00');
  });

  it('normalizes valid codes and rejects invalid settings safely', () => {
    configureCurrencyCode(' eur ');
    expect(getCurrencyCode()).toBe('EUR');
    expect(getCurrencySymbol()).toBe('€');

    configureCurrencyCode('not-a-currency');
    expect(getCurrencyCode()).toBe('USD');
  });

  it('formats compact values without losing the configured currency', () => {
    expect(formatMoneyCompact(1_500)).toContain('$');
    expect(formatMoneyCompact(1_500)).toContain('K');
  });
});
