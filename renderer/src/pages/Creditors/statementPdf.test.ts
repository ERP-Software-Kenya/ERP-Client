import { describe, expect, it } from 'vitest';
import { buildCreditorStatementHtml } from './statementPdf';

describe('buildCreditorStatementHtml', () => {
  it('is a customer account statement with debit/credit/balance columns', () => {
    const html = buildCreditorStatementHtml({
      orgName: 'Test Org',
      customerName: 'Yaddah',
      customerAddress: 'Eldoret',
      pinCode: '30100',
      shopName: 'Yaddah Shop',
      currentOwed: 49_000,
      rows: [
        {
          date: '2026-03-01T00:00:00.000Z',
          invNo: '3001',
          description: 'Credit sale',
          debit: 52_000,
          credit: 0,
          balance: 52_000,
        },
        {
          date: '2026-03-05T00:00:00.000Z',
          invNo: '',
          description: 'Bank Payment',
          debit: 0,
          credit: 3_000,
          balance: 49_000,
        },
      ],
    });
    expect(html).toContain('CUSTOMER ACCOUNT STATEMENT');
    expect(html).toContain('INV NO');
    expect(html).toContain('DEBIT');
    expect(html).toContain('CREDIT');
    expect(html).toContain('BALANCE');
    expect(html).toContain('3001');
    expect(html).toContain('Yaddah');
    expect(html).toContain('CURRENT BALANCE');
    expect(html).toContain('Only');
  });
});
