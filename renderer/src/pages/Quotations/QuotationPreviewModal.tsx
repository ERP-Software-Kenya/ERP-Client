import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Quotations } from '../../api';
import { toast } from 'sonner';
import { X, Download, Mail, Loader2, FileText, Send } from 'lucide-react';
import type { Quotation } from '../../types';

interface QuotationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation;
  companyName?: string;
  onEmailSent?: () => void;
}

export default function QuotationPreviewModal({
  isOpen,
  onClose,
  quotation,
  companyName = 'Pramukh Digital ERP',
  onEmailSent,
}: QuotationPreviewModalProps) {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(quotation.customer?.email ?? '');
  const [subject, setSubject] = useState(`Quotation ${quotation.quoteNumber} from ${companyName}`);
  const [body] = useState(
    `<p>Dear ${quotation.customer?.name ?? 'Valued Customer'},</p><p>Please find attached our quotation <strong>${quotation.quoteNumber}</strong> for your review.</p><p>Total Amount (Tax Inclusive): <strong>₹${Number(quotation.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></p><p>Thank you for your business!</p>`,
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const sendEmailMutation = Quotations.useSendEmail();

  if (!isOpen) return null;

  const generatePrintableHtml = (): string => {
    const itemsRows = (quotation.items ?? [])
      .map(
        (item, idx) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px;">
            <div style="font-weight: 600;">${item.product?.name ?? 'Product'}</div>
            ${item.product?.sku ? `<div style="font-size: 10px; color: #64748b;">SKU: ${item.product.sku}</div>` : ''}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right;">₹${Number(item.unitPriceInclusive).toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right;">${item.taxRate}%</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right;">₹${Number(item.taxAmount).toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right; font-weight: 600;">₹${Number(item.lineTotal).toFixed(2)}</td>
        </tr>`,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Quotation ${quotation.quoteNumber}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 24px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
          .company-title { font-size: 24px; font-weight: 800; color: #0f172a; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: #e2e8f0; text-transform: uppercase; }
          .meta-grid { display: flex; justify-content: space-between; margin-bottom: 24px; }
          .meta-col { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #cbd5e1; }
          .totals-box { margin-left: auto; width: 280px; border-top: 1px solid #cbd5e1; padding-top: 12px; }
          .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
          .totals-grand { font-size: 16px; font-weight: 800; border-top: 2px solid #0f172a; margin-top: 8px; padding-top: 8px; }
          .notes { margin-top: 24px; padding: 12px; background: #f8fafc; border-radius: 6px; font-size: 12px; color: #475569; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-title">${companyName}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
              ${quotation.location?.name ?? 'Branch Location'}<br />
              ${quotation.location?.address ?? ''}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 20px; font-weight: 800; color: #0284c7;">ESTIMATE / QUOTATION</div>
            <div style="font-size: 14px; font-weight: 700; margin-top: 4px;">${quotation.quoteNumber}</div>
            <div style="font-size: 12px; color: #64748b;">Version ${quotation.versionNumber}</div>
            <div style="margin-top: 6px;"><span class="badge">${quotation.status}</span></div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-col">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px;">Quotation For:</div>
            <div style="font-size: 14px; font-weight: 700;">${quotation.customer?.name ?? 'Customer'}</div>
            ${quotation.customer?.phone ? `<div style="font-size: 12px; color: #475569;">Ph: ${quotation.customer.phone}</div>` : ''}
            ${quotation.customer?.email ? `<div style="font-size: 12px; color: #475569;">Email: ${quotation.customer.email}</div>` : ''}
            ${quotation.customer?.gstin ? `<div style="font-size: 12px; color: #475569;">GSTIN: ${quotation.customer.gstin}</div>` : ''}
            ${quotation.customer?.address ? `<div style="font-size: 12px; color: #475569;">${quotation.customer.address}</div>` : ''}
          </div>
          <div class="meta-col" style="text-align: right;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px;">Quote Details:</div>
            <div style="font-size: 12px; color: #475569;">Date: <strong>${new Date(quotation.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
            <div style="font-size: 12px; color: #475569;">Pricing: <strong>Tax Inclusive</strong></div>
            ${quotation.createdByUser ? `<div style="font-size: 12px; color: #475569;">Prepared by: ${quotation.createdByUser.firstName ?? ''} ${quotation.createdByUser.lastName ?? ''}</div>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Item Description</th>
              <th style="text-align: right; width: 60px;">Qty</th>
              <th style="text-align: right; width: 100px;">Rate (Inc)</th>
              <th style="text-align: right; width: 70px;">Tax %</th>
              <th style="text-align: right; width: 90px;">Tax (₹)</th>
              <th style="text-align: right; width: 110px;">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="totals-box">
          <div class="totals-row">
            <span>Taxable Base:</span>
            <span>₹${Number(quotation.subtotal).toFixed(2)}</span>
          </div>
          <div class="totals-row">
            <span>Total GST Amount:</span>
            <span>₹${Number(quotation.taxAmount).toFixed(2)}</span>
          </div>
          <div class="totals-row totals-grand">
            <span>Grand Total:</span>
            <span>₹${Number(quotation.totalAmount).toFixed(2)}</span>
          </div>
        </div>

        ${
          quotation.notes
            ? `<div class="notes">
                <strong>Notes & Terms:</strong><br />
                ${quotation.notes.replace(/\n/g, '<br />')}
              </div>`
            : ''
        }
      </body>
      </html>
    `;
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const html = generatePrintableHtml();
      if (window.electronAPI?.savePdf) {
        const res = await window.electronAPI.savePdf({
          html,
          defaultFileName: `Quotation_${quotation.quoteNumber}.pdf`,
        });
        if (res.success && res.filePath) {
          toast.success(`PDF saved to: ${res.filePath}`);
        } else if (res.canceled) {
          // User closed file dialog
        } else {
          toast.error(res.error || 'Failed to save PDF');
        }
      } else {
        // Browser fallback: open print dialog
        const printWin = window.open('', '_blank');
        if (printWin) {
          printWin.document.write(html);
          printWin.document.close();
          printWin.focus();
          printWin.print();
        }
      }
    } catch (err) {
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail.trim()) {
      toast.error('Recipient email is required');
      return;
    }
    setIsSending(true);
    try {
      const html = generatePrintableHtml();
      let pdfBase64: string | undefined = undefined;

      if (window.electronAPI?.getPdfBase64) {
        const res = await window.electronAPI.getPdfBase64({ html });
        if (res.success && res.base64) {
          pdfBase64 = res.base64;
        }
      }

      await sendEmailMutation.mutateAsync({
        id: quotation.id,
        recipientEmail: recipientEmail.trim(),
        subject: subject.trim(),
        body: body.trim(),
        pdfBase64,
      });

      setShowEmailForm(false);
      if (onEmailSent) onEmailSent();
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in-50">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-primary" />
            <div>
              <h2 className="text-base font-bold text-foreground">
                Quotation Preview: {quotation.quoteNumber} (v{quotation.versionNumber})
              </h2>
              <p className="text-xs text-muted-foreground">
                Customer: {quotation.customer?.name} • Status: {quotation.status}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="gap-1.5"
            >
              {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              <span>Download PDF</span>
            </Button>
            <Button
              variant={showEmailForm ? 'secondary' : 'default'}
              size="sm"
              onClick={() => setShowEmailForm((v) => !v)}
              className="gap-1.5"
            >
              <Mail size={15} />
              <span>{showEmailForm ? 'Hide Email Form' : 'Email to Customer'}</span>
            </Button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted ml-2 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Optional Email Drawer Section */}
        {showEmailForm && (
          <div className="px-6 py-4 bg-primary/5 border-b border-primary/20 space-y-3 animate-in slide-in-from-top-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Email Quotation with Attached PDF
              </span>
              <span className="text-xs text-muted-foreground">
                Attachment: Quotation_{quotation.quoteNumber}.pdf
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Recipient Email
                </label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Subject
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-background"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowEmailForm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSendEmail}
                disabled={isSending}
                className="gap-1.5"
              >
                {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Send Email Now</span>
              </Button>
            </div>
          </div>
        )}

        {/* Live A4 Sheet Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-900/60 custom-scrollbar flex justify-center">
          <div className="w-full max-w-2xl bg-white text-slate-900 shadow-lg border border-slate-200 rounded-sm p-8 min-h-[700px] text-xs space-y-6">
            {/* Sheet Header */}
            <div className="flex justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <div className="text-xl font-extrabold text-slate-900 tracking-tight">{companyName}</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {quotation.location?.name ?? 'Branch Location'}<br />
                  {quotation.location?.address ?? ''}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-sky-600 tracking-wider uppercase">Quotation</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{quotation.quoteNumber}</div>
                <div className="text-[11px] text-slate-500">Version {quotation.versionNumber}</div>
                <div className="mt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200 text-slate-800">
                    {quotation.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Parties Metadata */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Quote For:</div>
                <div className="font-bold text-sm text-slate-900">{quotation.customer?.name ?? 'Customer'}</div>
                {quotation.customer?.phone && <div className="text-slate-600">Ph: {quotation.customer.phone}</div>}
                {quotation.customer?.email && <div className="text-slate-600">Email: {quotation.customer.email}</div>}
                {quotation.customer?.gstin && <div className="text-slate-600">GSTIN: {quotation.customer.gstin}</div>}
                {quotation.customer?.address && <div className="text-slate-600">{quotation.customer.address}</div>}
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Details:</div>
                <div className="text-slate-600">
                  Date: <span className="font-semibold text-slate-900">{new Date(quotation.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="text-slate-600">
                  Pricing: <span className="font-semibold text-slate-900">Tax Inclusive</span>
                </div>
                {quotation.createdByUser && (
                  <div className="text-slate-600">
                    Prepared by: <span className="font-semibold text-slate-900">{quotation.createdByUser.firstName} {quotation.createdByUser.lastName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-hidden border border-slate-200 rounded">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                  <tr>
                    <th className="p-2 text-center w-8">#</th>
                    <th className="p-2">Item Description</th>
                    <th className="p-2 text-right w-14">Qty</th>
                    <th className="p-2 text-right w-24">Rate (Inc)</th>
                    <th className="p-2 text-right w-16">Tax %</th>
                    <th className="p-2 text-right w-20">Tax (₹)</th>
                    <th className="p-2 text-right w-24">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(quotation.items ?? []).map((item, idx) => (
                    <tr key={item.id ?? idx}>
                      <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-2">
                        <div className="font-semibold text-slate-800">{item.product?.name ?? 'Product'}</div>
                        {item.product?.sku && <div className="text-[10px] text-slate-400">SKU: {item.product.sku}</div>}
                      </td>
                      <td className="p-2 text-right">{item.quantity}</td>
                      <td className="p-2 text-right">₹{Number(item.unitPriceInclusive).toFixed(2)}</td>
                      <td className="p-2 text-right text-slate-500">{item.taxRate}%</td>
                      <td className="p-2 text-right text-slate-500">₹{Number(item.taxAmount).toFixed(2)}</td>
                      <td className="p-2 text-right font-bold text-slate-900">₹{Number(item.lineTotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 border-t border-slate-200 pt-2 text-right">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Subtotal:</span>
                  <span>₹{Number(quotation.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total GST:</span>
                  <span>₹{Number(quotation.taxAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t-2 border-slate-900 pt-1.5 mt-1">
                  <span>Grand Total (Inc):</span>
                  <span>₹{Number(quotation.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {quotation.notes && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Notes & Terms:</span>
                <p className="whitespace-pre-wrap">{quotation.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
