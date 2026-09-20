import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Quotations, Locations } from '../../api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  FileText,
  Plus,
  Search,
  Eye,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';
import QuotationPreviewModal from './QuotationPreviewModal';
import ConvertQuotationModal from './ConvertQuotationModal';
import type { Quotation } from '../../types';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Quotations' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'SENT', label: 'Sent' },
  { id: 'CONVERTED', label: 'Converted' },
  { id: 'SUPERSEDED', label: 'Superseded' },
];

export default function QuotationsListPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [page, setPage] = useState(1);

  const [previewQuote, setPreviewQuote] = useState<Quotation | null>(null);
  const [quoteToConvert, setQuoteToConvert] = useState<Quotation | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const convertToOrder = Quotations.useConvertToOrder();
  const { data: locationsData } = Locations.useList();

  const queryParams = useMemo(() => {
    return {
      $page: page,
      $perPage: 25,
      status: activeTab === 'ALL' ? undefined : activeTab,
      locationId: selectedLocationId || undefined,
      search: searchTerm.trim() || undefined,
    };
  }, [activeTab, selectedLocationId, searchTerm, page]);

  const { data, isLoading } = Quotations.useSearch({
    page: queryParams.$page,
    limit: queryParams.$perPage,
    filters: {
      ...(queryParams.status ? { status: queryParams.status } : {}),
      ...(queryParams.locationId ? { locationId: queryParams.locationId } : {}),
      ...(queryParams.search ? { search: queryParams.search } : {}),
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'SENT':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'CONVERTED':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'SUPERSEDED':
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FileText className="text-primary" size={26} />
            <span>Quotations & Estimates</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tax-inclusive sales proposals with instant Sales Order conversion and zero-load PDF generation.
          </p>
        </div>
        <Button onClick={() => navigate('/quotations/new')} className="gap-1.5 shadow-sm">
          <Plus size={16} />
          <span>New Quotation</span>
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 border-b border-border pb-3 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Location Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search by quote number, customer name or phone..."
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="w-64">
            <select
              value={selectedLocationId}
              onChange={(e) => {
                setSelectedLocationId(e.target.value);
                setPage(1);
              }}
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary h-9"
            >
              <option value="">All Locations / Branches</option>
              {(locationsData ?? []).map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="p-3 pl-4">Quote Number</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Location</th>
                <th className="p-3 text-right">Items</th>
                <th className="p-3 text-right">Grand Total (₹)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Date</th>
                <th className="p-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Loading quotations...
                  </td>
                </tr>
              ) : (data?.items?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    <FileText size={32} className="mx-auto mb-2 opacity-40 text-muted-foreground" />
                    <p className="font-semibold text-foreground">No quotations found</p>
                    <p className="text-[11px] mt-0.5">Create a new quotation to get started.</p>
                  </td>
                </tr>
              ) : (
                (data?.items ?? []).map((quote) => (
                  <tr key={quote.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 pl-4">
                      <div className="font-bold text-foreground hover:text-primary cursor-pointer" onClick={() => navigate(`/quotations/${quote.id}`)}>
                        {quote.quoteNumber}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Version {quote.versionNumber}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-foreground">{quote.customer?.name ?? '—'}</div>
                      <div className="text-[10px] text-muted-foreground">{quote.customer?.phone ?? ''}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {quote.location?.name ?? '—'}
                    </td>
                    <td className="p-3 text-right font-medium">
                      {quote.items?.length ?? 0}
                    </td>
                    <td className="p-3 text-right font-bold text-foreground">
                      ₹{Number(quote.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getStatusBadge(quote.status)}`}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(quote.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewQuote(quote)}
                          title="Preview & Export PDF"
                          className="h-7 w-7 p-0"
                        >
                          <Eye size={14} />
                        </Button>
                        {quote.status !== 'CONVERTED' && quote.status !== 'SUPERSEDED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setQuoteToConvert(quote)}
                            title="Convert to Sales Order"
                            className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                          >
                            <ShoppingCart size={14} />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/quotations/${quote.id}`)}
                          className="h-7 px-2.5 text-[11px]"
                        >
                          Open
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {previewQuote && (
        <QuotationPreviewModal
          isOpen={!!previewQuote}
          onClose={() => setPreviewQuote(null)}
          quotation={previewQuote}
        />
      )}

      {/* Convert to Sales Order Custom Modal */}
      {quoteToConvert && (
        <ConvertQuotationModal
          open={!!quoteToConvert}
          onOpenChange={(open) => !open && setQuoteToConvert(null)}
          quotation={quoteToConvert}
          isConverting={isConverting}
          onConfirm={async () => {
            if (!quoteToConvert) return;
            setIsConverting(true);
            try {
              const order = await convertToOrder.mutateAsync({ id: quoteToConvert.id });
              toast.success(`Sales Order ${order.orderNumber} created!`);
              setQuoteToConvert(null);
              navigate('/orders/list');
            } catch (err: unknown) {
              toast.error((err as Error)?.message || 'Failed to convert quotation');
            } finally {
              setIsConverting(false);
            }
          }}
        />
      )}
    </div>
  );
}
