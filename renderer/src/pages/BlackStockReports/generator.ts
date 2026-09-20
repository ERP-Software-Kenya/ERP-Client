import {
  type BlackReportLog,
  type GenerateBlackReportInput,
  BLACK_REPORT_TYPE_LABEL,
} from './constants';
import type { Location, Product, UnpublishedStock, Bill, CommissionPayable } from '../../types';

function inr(num: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(num);
}

function fmtDate(dStr: string): string {
  if (!dStr) return '—';
  return new Date(dStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function generateReportData(
  input: GenerateBlackReportInput,
  unpublishedStock: UnpublishedStock[],
  bills: Bill[],
  commissions: CommissionPayable[],
  products: Product[],
  locations: Location[],
): BlackReportLog {
  const prodMap = new Map(products.map((p) => [p.id, p.name]));
  const locMap = new Map(locations.map((l) => [l.id, l.name]));

  const locationName = input.locationId ? locMap.get(input.locationId) || 'Location' : 'All Locations';
  const fromTime = new Date(input.fromDate).getTime();
  const toTime = new Date(input.toDate).getTime();

  // Filter bills
  const filteredBills = bills.filter((b) => {
    if (input.locationId && b.locationId !== input.locationId) return false;
    if (b.billedAt || b.createdAt) {
      const t = new Date(b.billedAt || b.createdAt!).getTime();
      if (t < fromTime || t > toTime) return false;
    }
    return true;
  });

  // Filter unpublished stock
  const filteredStock = unpublishedStock.filter((s) => {
    if (input.locationId && s.locationId !== input.locationId) return false;
    return true;
  });

  // Filter commissions
  const filteredCommissions = commissions.filter((c) => {
    if (c.createdAt) {
      const t = new Date(c.createdAt).getTime();
      if (t < fromTime || t > toTime) return false;
    }
    return true;
  });

  const typeLabel = BLACK_REPORT_TYPE_LABEL[input.reportType] || 'Report';
  const reportName = `${typeLabel} — ${fmtDate(input.fromDate)} to ${fmtDate(input.toDate)}`;

  let summaryCards: Array<{ label: string; value: string }> = [];
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  switch (input.reportType) {
    case 'black_closing_stock': {
      const totalQty = filteredStock.reduce((acc, s) => acc + Number(s.quantityOnHand || 0), 0);
      summaryCards = [
        { label: 'Staged Items', value: String(filteredStock.length) },
        { label: 'Total Units On Hand', value: String(Math.round(totalQty)) },
        { label: 'Location Scope', value: locationName },
      ];
      tableHeaders = ['Product Name', 'Location', 'Quantity On Hand', 'Status'];
      tableRows = filteredStock.map((s) => [
        prodMap.get(s.productId) || s.productId.slice(0, 8),
        locMap.get(s.locationId) || s.locationId.slice(0, 8),
        String(s.quantityOnHand),
        Number(s.quantityOnHand) > 0 ? 'In Stock' : 'Depleted',
      ]);
      break;
    }

    case 'black_low_stock': {
      const lowItems = filteredStock.filter((s) => Number(s.quantityOnHand || 0) <= 5);
      summaryCards = [
        { label: 'Low Stock Items', value: String(lowItems.length) },
        { label: 'Threshold', value: '≤ 5 units' },
      ];
      tableHeaders = ['Product Name', 'Location', 'Units Left', 'Severity'];
      tableRows = lowItems.map((s) => [
        prodMap.get(s.productId) || s.productId.slice(0, 8),
        locMap.get(s.locationId) || s.locationId.slice(0, 8),
        String(s.quantityOnHand),
        Number(s.quantityOnHand) === 0 ? 'Out of Stock' : 'Low',
      ]);
      break;
    }

    case 'black_total_sales': {
      const totalRev = filteredBills.reduce((acc, b) => acc + Number(b.totalAmount || 0), 0);
      const avgBill = filteredBills.length ? totalRev / filteredBills.length : 0;
      summaryCards = [
        { label: 'Total Black Bills', value: String(filteredBills.length) },
        { label: 'Gross Revenue', value: inr(totalRev) },
        { label: 'Average Bill Value', value: inr(avgBill) },
      ];
      tableHeaders = ['Bill Number', 'Date', 'Payment Method', 'Customer Ref', 'Total Amount'];
      tableRows = filteredBills.map((b) => [
        b.billNumber || b.id.slice(0, 8),
        fmtDate(b.billedAt || b.createdAt || ''),
        String(b.paymentMethod || 'CASH'),
        b.customerId ? b.customerId.slice(0, 8) : 'Walk-in',
        inr(Number(b.totalAmount || 0)),
      ]);
      break;
    }

    case 'black_markup_profit': {
      const totalRev = filteredBills.reduce((acc, b) => acc + Number(b.totalAmount || 0), 0);
      const totalMarkup = filteredBills.reduce((acc, b) => acc + Number(b.blackAmount || 0), 0);
      summaryCards = [
        { label: 'Total Black Bills', value: String(filteredBills.length) },
        { label: 'Gross Total', value: inr(totalRev) },
        { label: 'Pure Black Markup (Profit)', value: inr(totalMarkup) },
      ];
      tableHeaders = ['Bill Number', 'Date', 'Charged Total', 'Black Markup', 'Facilitator'];
      tableRows = filteredBills.map((b) => [
        b.billNumber || b.id.slice(0, 8),
        fmtDate(b.billedAt || b.createdAt || ''),
        inr(Number(b.totalAmount || 0)),
        inr(Number(b.blackAmount || 0)),
        b.facilitatorName || (b.facilitatorUserId ? 'Staff User' : 'None'),
      ]);
      break;
    }

    case 'black_all_commissions': {
      const totalComm = filteredCommissions.reduce((acc, c) => acc + Number(c.amount || 0), 0);
      const paidComm = filteredCommissions
        .filter((c) => c.status === 'paid')
        .reduce((acc, c) => acc + Number(c.amount || 0), 0);
      const owedComm = filteredCommissions
        .filter((c) => c.status === 'owed')
        .reduce((acc, c) => acc + Number(c.amount || 0), 0);

      summaryCards = [
        { label: 'Total Commissions', value: inr(totalComm) },
        { label: 'Paid Out', value: inr(paidComm) },
        { label: 'Pending Owed', value: inr(owedComm) },
      ];
      tableHeaders = ['Facilitator Name', 'Bill Reference', 'Amount', 'Status', 'Date'];
      tableRows = filteredCommissions.map((c) => [
        c.facilitatorName || (c.facilitatorUserId ? c.facilitatorUserId.slice(0, 8) : 'Unknown'),
        c.billId.slice(0, 8),
        inr(Number(c.amount || 0)),
        c.status.toUpperCase(),
        fmtDate(c.createdAt || ''),
      ]);
      break;
    }

    case 'black_unpaid_commissions': {
      const unpaid = filteredCommissions.filter((c) => c.status === 'owed');
      const owedTotal = unpaid.reduce((acc, c) => acc + Number(c.amount || 0), 0);
      summaryCards = [
        { label: 'Pending Payouts', value: String(unpaid.length) },
        { label: 'Total Unpaid Amount', value: inr(owedTotal) },
      ];
      tableHeaders = ['Facilitator', 'Bill Reference', 'Amount Owed', 'Recorded On'];
      tableRows = unpaid.map((c) => [
        c.facilitatorName || (c.facilitatorUserId ? c.facilitatorUserId.slice(0, 8) : 'Unknown'),
        c.billId.slice(0, 8),
        inr(Number(c.amount || 0)),
        fmtDate(c.createdAt || ''),
      ]);
      break;
    }

    case 'black_top_products': {
      summaryCards = [
        { label: 'Active Products', value: String(filteredStock.length) },
        { label: 'Location', value: locationName },
      ];
      tableHeaders = ['Product Name', 'Location', 'Staged Quantity', 'Unit Cost'];
      tableRows = filteredStock.map((s) => [
        prodMap.get(s.productId) || s.productId.slice(0, 8),
        locMap.get(s.locationId) || s.locationId.slice(0, 8),
        String(s.quantityOnHand),
        inr(Number(s.unitCost || 0)),
      ]);
      break;
    }

    case 'black_stock_movements':
    default: {
      summaryCards = [
        { label: 'Staged Records', value: String(filteredStock.length) },
        { label: 'Scope', value: locationName },
      ];
      tableHeaders = ['Product Name', 'Location', 'Current Stock', 'Created At'];
      tableRows = filteredStock.map((s) => [
        prodMap.get(s.productId) || s.productId.slice(0, 8),
        locMap.get(s.locationId) || s.locationId.slice(0, 8),
        String(s.quantityOnHand),
        fmtDate(s.createdAt || ''),
      ]);
      break;
    }
  }

  return {
    id: `blk-rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    reportName,
    reportType: input.reportType,
    reportPeriod: input.reportPeriod,
    fromDate: input.fromDate,
    toDate: input.toDate,
    locationId: input.locationId,
    locationName,
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    summaryCards,
    tableHeaders,
    tableRows,
  };
}
