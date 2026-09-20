import { describe, it, expect } from 'vitest';
import {
  formatPayment,
  extractRef,
  money,
  moneyOrZero,
} from './salesHelpers';

describe('salesHelpers', () => {
  describe('formatPayment', () => {
    it('returns COD when paymentTiming is cod and paymentMethod is missing', () => {
      expect(formatPayment({ paymentTiming: 'cod' })).toBe('COD');
    });

    it('returns COD when paymentTiming is cod and paymentMethod is cash', () => {
      expect(formatPayment({ paymentTiming: 'cod', paymentMethod: 'CASH' })).toBe('COD');
      expect(formatPayment({ paymentTiming: 'cod', paymentMethod: 'cash' })).toBe('COD');
    });

    it('returns COD with method when paymentTiming is cod and paymentMethod is not cash', () => {
      expect(formatPayment({ paymentTiming: 'cod', paymentMethod: 'UPI' })).toBe('COD (UPI)');
      expect(formatPayment({ paymentTiming: 'cod', paymentMethod: 'NET_BANKING' })).toBe('COD (Net Banking)');
    });

    it('returns formatted payment method when timing is missing', () => {
      expect(formatPayment({ paymentMethod: 'CASH' })).toBe('Cash');
      expect(formatPayment({ paymentMethod: 'UPI' })).toBe('UPI');
      expect(formatPayment({ paymentMethod: 'NET_BANKING' })).toBe('Net Banking');
      expect(formatPayment({ paymentMethod: 'CARD' })).toBe('Card');
      expect(formatPayment({ paymentMethod: 'CHEQUE' })).toBe('Cheque');
      expect(formatPayment({ paymentMethod: 'CREDIT' })).toBe('Credit');
    });

    it('returns method with timing when both are present and timing is not cod', () => {
      expect(formatPayment({ paymentMethod: 'CASH', paymentTiming: 'before_delivery' })).toBe(
        'Cash (Before Delivery)',
      );
      expect(formatPayment({ paymentMethod: 'NET_BANKING', paymentTiming: 'half' })).toBe(
        'Net Banking (Half)',
      );
    });

    it('returns timing when method is missing and timing is not cod', () => {
      expect(formatPayment({ paymentTiming: 'after_delivery' })).toBe('After Delivery');
      expect(formatPayment({ paymentTiming: 'before_delivery' })).toBe('Before Delivery');
      expect(formatPayment({ paymentTiming: 'half' })).toBe('Half');
    });

    it('returns dash when neither is present or row is nil', () => {
      expect(formatPayment({})).toBe('—');
      expect(formatPayment({ paymentMethod: null, paymentTiming: null })).toBe('—');
      expect(formatPayment(null)).toBe('—');
      expect(formatPayment(undefined)).toBe('—');
    });
  });

  describe('money & moneyOrZero', () => {
    it('formats numbers with KSh currency', () => {
      expect(money(42)).toBe('KSh 42.00');
      expect(money(65)).toBe('KSh 65.00');
      expect(money(0)).toBe('KSh 0.00');
    });

    it('money returns dash on null or undefined or NaN', () => {
      expect(money(null)).toBe('—');
      expect(money(undefined)).toBe('—');
      expect(money(NaN)).toBe('—');
    });

    it('moneyOrZero returns KSh 0.00 on null or undefined or NaN or 0', () => {
      expect(moneyOrZero(null)).toBe('KSh 0.00');
      expect(moneyOrZero(undefined)).toBe('KSh 0.00');
      expect(moneyOrZero(NaN)).toBe('KSh 0.00');
      expect(moneyOrZero(0)).toBe('KSh 0.00');
      expect(moneyOrZero(15.5)).toBe('KSh 15.50');
    });
  });

  describe('extractRef', () => {
    it('extracts reference from notes', () => {
      expect(extractRef('Ref: INV-001')).toBe('INV-001');
      expect(extractRef('Pay ref: TXN-123')).toBe('TXN-123');
      expect(extractRef('Payment ref: 98765')).toBe('98765');
      expect(extractRef('Reference: PO-999')).toBe('PO-999');
      expect(extractRef('Store: Main Store · Ref: ORDER-42 · Driver: Bob')).toBe('ORDER-42');
    });

    it('extracts short standalone reference', () => {
      expect(extractRef('PO-10023')).toBe('PO-10023');
    });

    it('returns dash when no reference', () => {
      expect(extractRef('')).toBe('—');
      expect(extractRef(null)).toBe('—');
      expect(extractRef(undefined)).toBe('—');
      expect(extractRef('Store: Main Store · Driver: Bob')).toBe('—');
    });
  });
});
