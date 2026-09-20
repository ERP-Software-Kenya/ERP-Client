import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Quotations,
  Customers,
  Products,
  Locations,
  Inventory,
} from '../../api';
import { useSession } from '../../context/SessionContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Save,
  FileText,
  ArrowLeft,
  Loader2,
  GitBranch,
  Eye,
  ShoppingCart,
  UserPlus,
} from 'lucide-react';
import QuickCustomerModal from './QuickCustomerModal';
import QuotationPreviewModal from './QuotationPreviewModal';
import ConvertQuotationModal from './ConvertQuotationModal';
import type { Product, QuotationItem } from '../../types';

interface BuilderItemRow {
  productId: string;
  variantId?: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPriceInclusive: number;
  taxRate: number;
  stockAvailable?: number;
}

export default function QuotationBuilder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== 'new');

  const { activeLocationId } = useSession();
  const [selectedLocationId, setSelectedLocationId] = useState<string>(activeLocationId ?? '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<BuilderItemRow[]>([]);

  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Queries
  const quoteId = isEditing ? id : undefined;
  const { data: quotation } = Quotations.useGet(quoteId);
  const { data: revisions } = Quotations.useRevisions(quoteId);
  const { data: locationsData } = Locations.useList();
  const { data: customersData } = Customers.useSearch({ search: customerSearch, limit: 10, enabled: showCustomerDropdown });
  const { data: productsData } = Products.useSearch({ limit: 100 });
  const { data: inventoryData } = Inventory.useList(selectedLocationId || undefined);

  // Mutations
  const createQuotation = Quotations.useCreate();
  const updateQuotation = Quotations.useUpdate();
  const reviseQuotation = Quotations.useRevise();
  const convertToOrder = Quotations.useConvertToOrder();

  // Stock lookup map
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    (inventoryData ?? []).forEach((inv) => {
      map.set(inv.productId, Number(inv.quantityOnHand ?? 0));
    });
    return map;
  }, [inventoryData]);

  const initializedQuoteId = useRef<string | null>(null);

  // Sync initial quotation state if editing
  useEffect(() => {
    if (quotation && quotation.id !== initializedQuoteId.current) {
      initializedQuoteId.current = quotation.id;
      setSelectedLocationId(quotation.locationId);
      setSelectedCustomerId(quotation.customerId);
      setNotes(quotation.notes ?? '');
      if (quotation.customer) {
        setCustomerSearch(quotation.customer.name);
      }
      if (quotation.items) {
        setItems(
          quotation.items.map((qi: QuotationItem) => ({
            productId: qi.productId,
            variantId: qi.variantId,
            productName: qi.product?.name ?? 'Product',
            sku: qi.product?.sku,
            quantity: Number(qi.quantity),
            unitPriceInclusive: Number(qi.unitPriceInclusive),
            taxRate: Number(qi.taxRate ?? 0),
            stockAvailable: stockMap.get(qi.productId) ?? 0,
          })),
        );
      }
    }
  }, [quotation, stockMap]);

  // Real-time tax-inclusive totals
  const totals = useMemo(() => {
    let subtotal = 0;
    let taxAmount = 0;
    let grandTotal = 0;

    items.forEach((item) => {
      const lineTotal = Math.round(item.quantity * item.unitPriceInclusive * 100) / 100;
      const unitTaxable = item.taxRate > 0 ? item.unitPriceInclusive / (1 + item.taxRate / 100) : item.unitPriceInclusive;
      const lineTaxable = Math.round(unitTaxable * item.quantity * 10000) / 10000;
      const lineTax = Math.round((lineTotal - lineTaxable) * 100) / 100;

      subtotal += lineTaxable;
      taxAmount += lineTax;
      grandTotal += lineTotal;
    });

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
    };
  }, [items]);

  const handleAddItem = (product?: Product) => {
    if (product) {
      // Check if already in items, increment qty
      const existingIdx = items.findIndex((i) => i.productId === product.id);
      if (existingIdx >= 0) {
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === existingIdx ? { ...it, quantity: it.quantity + 1 } : it,
          ),
        );
        return;
      }

      const available = stockMap.get(product.id) ?? 0;
      const rate = Number(product.retailPrice ?? 0);
      const taxRate = Number(product.taxRate ?? 18);

      setItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          unitPriceInclusive: rate,
          taxRate,
          stockAvailable: available,
        },
      ]);
    } else {
      // Blank row
      setItems((prev) => [
        ...prev,
        {
          productId: '',
          productName: '',
          quantity: 1,
          unitPriceInclusive: 0,
          taxRate: 18,
          stockAvailable: 0,
        },
      ]);
    }
  };

  const handleUpdateItem = (index: number, patch: Partial<BuilderItemRow>) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const updated = { ...item, ...patch };
        if (patch.productId && patch.productId !== item.productId) {
          const prod = (productsData?.items ?? []).find((p) => p.id === patch.productId);
          if (prod) {
            updated.productName = prod.name;
            updated.sku = prod.sku;
            updated.unitPriceInclusive = Number(prod.retailPrice ?? 0);
            updated.taxRate = Number(prod.taxRate ?? 18);
            updated.stockAvailable = stockMap.get(prod.id) ?? 0;
          }
        }
        return updated;
      }),
    );
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    if (!selectedLocationId) {
      toast.error('Please select a branch location');
      return;
    }
    if (!selectedCustomerId) {
      toast.error('Please select or register a customer');
      return;
    }
    if (items.length === 0 || items.some((i) => !i.productId || i.quantity <= 0)) {
      toast.error('Please add at least one valid product line with quantity > 0');
      return;
    }

    const payloadItems = items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: Number(i.quantity),
      unitPriceInclusive: Number(i.unitPriceInclusive),
      taxRate: Number(i.taxRate),
    }));

    try {
      if (isEditing) {
        await updateQuotation.mutateAsync({
          id: id!,
          locationId: selectedLocationId,
          customerId: selectedCustomerId,
          notes: notes.trim() || undefined,
          items: payloadItems,
        });
        toast.success('Quotation updated successfully');
      } else {
        const created = await createQuotation.mutateAsync({
          locationId: selectedLocationId,
          customerId: selectedCustomerId,
          notes: notes.trim() || undefined,
          items: payloadItems,
        });
        toast.success(`Quotation ${created.quoteNumber} created`);
        navigate(`/quotations/${created.id}`);
      }
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to save quotation');
    }
  };

  const handleRevise = async () => {
    if (!id) return;
    try {
      const newRev = await reviseQuotation.mutateAsync(id);
      navigate(`/quotations/${newRev.id}`);
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to create revision');
    }
  };

  const handleOpenConvertModal = () => {
    if (!id) return;
    if (items.length === 0) {
      toast.error('Cannot convert empty quotation');
      return;
    }
    setIsConvertModalOpen(true);
  };

  const handleConfirmConversion = async () => {
    if (!id) return;
    setIsConverting(true);
    try {
      const order = await convertToOrder.mutateAsync({ id });
      toast.success(`Sales Order ${order.orderNumber} created!`);
      setIsConvertModalOpen(false);
      navigate('/orders/list');
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to convert quotation');
    } finally {
      setIsConverting(false);
    }
  };

  const isReadOnly = quotation?.status === 'CONVERTED' || quotation?.status === 'SUPERSEDED';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/quotations')}>
            <ArrowLeft size={16} className="mr-1" />
            Back to List
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="text-primary" size={22} />
              <span>
                {isEditing ? `Quotation ${quotation?.quoteNumber ?? ''}` : 'New Quotation'}
              </span>
              {quotation && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                  {quotation.status} (v{quotation.versionNumber})
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tax-inclusive estimate • Zero stock deduction until converted
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {quotation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="gap-1.5"
            >
              <Eye size={15} />
              <span>Preview & Export</span>
            </Button>
          )}

          {quotation && quotation.status !== 'CONVERTED' && quotation.status !== 'SUPERSEDED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevise}
              disabled={reviseQuotation.isPending}
              className="gap-1.5"
            >
              <GitBranch size={15} />
              <span>Create Revision</span>
            </Button>
          )}

          {quotation && quotation.status !== 'CONVERTED' && quotation.status !== 'SUPERSEDED' && (
            <Button
              variant="default"
              size="sm"
              onClick={handleOpenConvertModal}
              disabled={isConverting}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isConverting ? <Loader2 size={15} className="animate-spin" /> : <ShoppingCart size={15} />}
              <span>Convert to Sales Order</span>
            </Button>
          )}

          {!isReadOnly && (
            <Button
              size="sm"
              onClick={() => handleSave()}
              disabled={createQuotation.isPending || updateQuotation.isPending}
              className="gap-1.5"
            >
              {createQuotation.isPending || updateQuotation.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              <span>{isEditing ? 'Save Changes' : 'Create Quotation'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Form Box */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left 2 Cols: Form & Item Matrix */}
        <div className="col-span-2 space-y-6">
          {/* Header Card: Location & Customer */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              General Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Branch / Location */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Branch / Location <span className="text-destructive">*</span>
                </label>
                <select
                  value={selectedLocationId}
                  disabled={isReadOnly}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Location</option>
                  {(locationsData ?? []).map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Picker with Quick Register */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Customer <span className="text-destructive">*</span>
                  </label>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => setIsQuickCustomerOpen(true)}
                      className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      <UserPlus size={13} />
                      <span>Quick Register</span>
                    </button>
                  )}
                </div>
                <Input
                  value={customerSearch}
                  disabled={isReadOnly}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Search customer by name or phone..."
                  className="w-full"
                />

                {/* Dropdown Results */}
                {showCustomerDropdown && !isReadOnly && (customersData?.items?.length ?? 0) > 0 && (
                  <div className="absolute z-20 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {(customersData?.items ?? []).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setCustomerSearch(c.name);
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-xs flex justify-between items-center transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground">{c.phone || c.email || 'No contact'}</div>
                        </div>
                        {c.gstin && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">GST: {c.gstin}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Notes & Terms (Printed on Quote)
              </label>
              <textarea
                value={notes}
                disabled={isReadOnly}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment terms, delivery schedule, validity notes..."
                rows={2}
                className="w-full bg-background border border-border rounded-md p-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Item Matrix Card */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Quotation Line Items
              </h2>
              {!isReadOnly && (
                <Button variant="outline" size="sm" onClick={() => handleAddItem()} className="gap-1 text-xs">
                  <Plus size={14} />
                  <span>Add Line</span>
                </Button>
              )}
            </div>

            {/* Items Table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-2.5 pl-3">Product / SKU</th>
                    <th className="p-2.5 text-center w-24">Live Stock</th>
                    <th className="p-2.5 text-right w-20">Qty</th>
                    <th className="p-2.5 text-right w-28">Rate (Inc ₹)</th>
                    <th className="p-2.5 text-right w-20">Tax %</th>
                    <th className="p-2.5 text-right w-28">Total (₹)</th>
                    {!isReadOnly && <th className="p-2.5 w-10 text-center"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No products added yet. Click &quot;Add Line&quot; or choose from quick items below.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2 pl-3">
                          {isReadOnly ? (
                            <div>
                              <div className="font-semibold text-foreground">{item.productName}</div>
                              {item.sku && <div className="text-[10px] text-muted-foreground">SKU: {item.sku}</div>}
                            </div>
                          ) : (
                            <select
                              value={item.productId}
                              onChange={(e) => handleUpdateItem(idx, { productId: e.target.value })}
                              className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary"
                            >
                              <option value="">Select Product...</option>
                              {(productsData?.items ?? []).map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} {p.sku ? `(${p.sku})` : ''} - ₹{p.retailPrice}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              (item.stockAvailable ?? 0) > 0
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            }`}
                          >
                            {(item.stockAvailable ?? 0) > 0 ? `${item.stockAvailable} in stock` : '0 in stock'}
                          </span>
                        </td>
                        <td className="p-2 text-right">
                          {isReadOnly ? (
                            <span className="font-semibold">{item.quantity}</span>
                          ) : (
                            <Input
                              type="number"
                              min="0.001"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                              className="w-20 text-right h-8 px-2 text-xs"
                            />
                          )}
                        </td>
                        <td className="p-2 text-right">
                          {isReadOnly ? (
                            <span className="font-semibold">₹{item.unitPriceInclusive}</span>
                          ) : (
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPriceInclusive}
                              onChange={(e) =>
                                handleUpdateItem(idx, { unitPriceInclusive: parseFloat(e.target.value) || 0 })
                              }
                              className="w-24 text-right h-8 px-2 text-xs"
                            />
                          )}
                        </td>
                        <td className="p-2 text-right">
                          {isReadOnly ? (
                            <span>{item.taxRate}%</span>
                          ) : (
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={item.taxRate}
                              onChange={(e) => handleUpdateItem(idx, { taxRate: parseFloat(e.target.value) || 0 })}
                              className="w-16 text-right h-8 px-2 text-xs"
                            />
                          )}
                        </td>
                        <td className="p-2 text-right font-bold text-foreground">
                          ₹{Math.round(item.quantity * item.unitPriceInclusive * 100) / 100}
                        </td>
                        {!isReadOnly && (
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Totals, Revisions & Status */}
        <div className="space-y-6">
          {/* Summary Box */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Financial Breakdown
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Taxable Subtotal:</span>
                <span className="font-medium text-foreground">₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total GST Tax:</span>
                <span className="font-medium text-foreground">₹{totals.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-foreground border-t border-border pt-3 mt-2">
                <span>Grand Total (Inc):</span>
                <span className="text-primary">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-[11px] text-muted-foreground space-y-1 border border-border/50">
              <div className="font-semibold text-foreground">Tax Inclusive Policy</div>
              <p>Prices entered include GST. Base taxable value and statutory tax amounts are back-calculated automatically.</p>
            </div>
          </div>

          {/* Revision History Card */}
          {revisions && revisions.length > 1 && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <GitBranch size={16} className="text-primary" />
                <span>Revision Lineage</span>
              </h2>
              <div className="space-y-2">
                {revisions.map((rev) => (
                  <div
                    key={rev.id}
                    onClick={() => rev.id !== id && navigate(`/quotations/${rev.id}`)}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                      rev.id === id
                        ? 'border-primary bg-primary/5 font-semibold text-primary'
                        : 'border-border hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div>
                      <div>{rev.quoteNumber}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(rev.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded font-bold bg-muted text-foreground">
                      {rev.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Register Customer Modal */}
      <QuickCustomerModal
        isOpen={isQuickCustomerOpen}
        onClose={() => setIsQuickCustomerOpen(false)}
        onSuccess={(customer) => {
          setSelectedCustomerId(customer.id);
          setCustomerSearch(customer.name);
        }}
      />

      {/* Preview & Email Modal */}
      {quotation && (
        <QuotationPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          quotation={quotation}
          onEmailSent={() => {
            toast.success('Email sent and quotation marked as SENT');
          }}
        />
      )}

      {/* Convert to Sales Order Custom Modal */}
      {quotation && (
        <ConvertQuotationModal
          open={isConvertModalOpen}
          onOpenChange={setIsConvertModalOpen}
          quotation={quotation}
          onConfirm={handleConfirmConversion}
          isConverting={isConverting}
        />
      )}
    </div>
  );
}
