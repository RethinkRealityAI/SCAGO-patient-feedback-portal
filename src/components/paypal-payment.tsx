'use client';

import { useState, useCallback } from 'react';
import { usePayPalV6 } from '@/hooks/use-paypal-v6';
import {
  Check,
  CreditCard,
  AlertCircle,
  Plus,
  Trash2,
  Tag,
  ChevronDown,
  ChevronUp,
  FileText,
  QrCode,
  Download,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaymentLineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  category?: 'DIGITAL_GOODS' | 'PHYSICAL_GOODS' | 'DONATION';
}

export interface PromoCode {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  label?: string;
}

export interface PaymentConfig {
  /** Title shown above the payment widget */
  title?: string;
  /** Currency code – defaults to CAD */
  currency?: string;
  /** Preset line items (e.g. from a membership form) */
  lineItems?: PaymentLineItem[];
  /** Allow respondents to add their own line items */
  allowCustomItems?: boolean;
  /** Allow respondents to change quantities */
  allowQuantityEdit?: boolean;
  /** Promo / discount codes accepted */
  promoCodes?: PromoCode[];
  /** Whether to allow promo code entry */
  allowPromoCodes?: boolean;
  /** Organisation name for receipt */
  organizationName?: string;
  /** Logo URL for receipt / invoice */
  logoUrl?: string;
  /** Tax rate 0-1 (e.g. 0.13 for 13%) */
  taxRate?: number;
  /** Tax label (e.g. "HST") */
  taxLabel?: string;
  /** Whether to generate a PDF receipt after payment */
  generateReceipt?: boolean;
  /** Whether to generate a QR code ticket after payment */
  generateQRTicket?: boolean;
  /** Footer text for receipt / ticket */
  receiptFooter?: string;
}

export interface PaymentValue {
  /** Paid line items at time of payment */
  lineItems: PaymentLineItem[];
  /** Applied promo code if any */
  promoCode?: PromoCode;
  /** Subtotal before discount/tax */
  subtotal: number;
  /** Discount amount */
  discount: number;
  /** Tax amount */
  tax: number;
  /** Grand total charged */
  total: number;
  /** Currency code */
  currency: string;
  /** PayPal transaction ID */
  transactionId: string;
  /** PayPal order ID */
  orderId: string;
  /** Invoice ID for internal tracking */
  invoiceId: string;
  /** ISO timestamp */
  paidAt: string;
  status: 'paid';
  /** Download URL for receipt PDF (set after generation) */
  receiptUrl?: string;
}

interface PayPalPaymentProps {
  config: PaymentConfig;
  value?: PaymentValue | null;
  onChange?: (value: PaymentValue) => void;
  clientId?: string;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function genInvoiceId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${ts}-${rand}`;
}

function calcTotals(
  items: PaymentLineItem[],
  promo: PromoCode | null,
  taxRate: number,
) {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  let discount = 0;
  if (promo) {
    discount =
      promo.type === 'percent'
        ? subtotal * (promo.value / 100)
        : Math.min(promo.value, subtotal);
  }
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * taxRate;
  const total = taxable + tax;
  return { subtotal, discount, tax, total };
}

function fmtMoney(amount: number, currency: string) {
  return `$${amount.toFixed(2)} ${currency}`;
}

// ---------------------------------------------------------------------------
// Server-side order helpers
// ---------------------------------------------------------------------------

async function createGenericOrder(amount: number, currency: string, description: string): Promise<{ orderId: string }> {
  const res = await fetch('/api/paypal/create-generic-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amount.toFixed(2), currency, description }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create order.');
  }
  return res.json();
}

async function captureOrder(orderId: string): Promise<{ captureId: string; status: string; amount: string; currency: string }> {
  const res = await fetch('/api/paypal/capture-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to capture order.');
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LineItemRow({
  item,
  allowQtyEdit,
  allowRemove,
  onQtyChange,
  onRemove,
  currency,
}: {
  item: PaymentLineItem;
  allowQtyEdit: boolean;
  allowRemove: boolean;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
  currency: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.name}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
        )}
      </div>
      {allowQtyEdit ? (
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onQtyChange(Math.max(1, item.quantity - 1))}
          >
            <span className="text-base leading-none">−</span>
          </Button>
          <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onQtyChange(item.quantity + 1)}
          >
            <span className="text-base leading-none">+</span>
          </Button>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground shrink-0">×{item.quantity}</span>
      )}
      <span className="text-sm font-semibold tabular-nums w-24 text-right shrink-0">
        {fmtMoney(item.unitPrice * item.quantity, currency)}
      </span>
      {allowRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive shrink-0"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function AddItemForm({
  onAdd,
  currency,
}: {
  onAdd: (item: PaymentLineItem) => void;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !price || Number(price) <= 0) return;
    onAdd({
      id: genId(),
      name: name.trim(),
      description: desc.trim() || undefined,
      quantity: qty,
      unitPrice: parseFloat(price),
    });
    setName(''); setDesc(''); setQty(1); setPrice(''); setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full border-dashed"
        onClick={() => setOpen(!open)}
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Item
        {open ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
      </Button>
      {open && (
        <div className="border rounded-lg p-3 space-y-2 bg-background">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Item Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Conference Registration"
                className="h-8 text-sm"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Description (optional)</Label>
              <Input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Brief description"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Quantity</Label>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Unit Price ({currency})</Label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={handleAdd}
              disabled={!name.trim() || !price || Number(price) <= 0}
            >
              Add to Order
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PromoCodeInput({
  validCodes,
  applied,
  onApply,
  onRemove,
}: {
  validCodes: PromoCode[];
  applied: PromoCode | null;
  onApply: (code: PromoCode) => void;
  onRemove: () => void;
}) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleApply = () => {
    const found = validCodes.find(
      (c) => c.code.toLowerCase() === input.trim().toLowerCase(),
    );
    if (found) {
      onApply(found);
      setInput('');
      setError('');
    } else {
      setError('Invalid promo code. Please try again.');
    }
  };

  if (applied) {
    return (
      <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg">
        <Tag className="h-4 w-4 text-green-600 shrink-0" />
        <span className="text-sm text-green-700 font-medium flex-1">
          {applied.label || applied.code} applied
          {applied.type === 'percent'
            ? ` (−${applied.value}%)`
            : ` (−$${applied.value.toFixed(2)})`}
        </span>
        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onRemove}>
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          placeholder="Enter promo code"
          className="h-9 text-sm flex-1"
        />
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={handleApply}>
          Apply
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QR Code data URL helper (uses goqr.me public API – no key needed)
// ---------------------------------------------------------------------------
function qrDataUrl(data: string, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

// ---------------------------------------------------------------------------
// PDF Receipt Generator (uses pdf-lib)
// ---------------------------------------------------------------------------
async function generateReceiptPdf(
  paymentValue: PaymentValue,
  config: PaymentConfig,
): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);

  const primary = rgb(0.784, 0.149, 0.165); // SCAGO red #C8262A
  const dark = rgb(0.12, 0.12, 0.12);
  const muted = rgb(0.5, 0.5, 0.5);
  const white = rgb(1, 1, 1);
  const lightGray = rgb(0.95, 0.95, 0.95);

  // Header band
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: primary });
  page.drawText((config.organizationName || 'SCAGO').toUpperCase(), {
    x: 40, y: height - 35, size: 18, font: bold, color: white,
  });
  page.drawText('PAYMENT RECEIPT', {
    x: 40, y: height - 58, size: 10, font: regular, color: rgb(1, 0.8, 0.8),
  });

  // Invoice meta (right side of header)
  const invX = width - 40;
  page.drawText(paymentValue.invoiceId, {
    x: invX, y: height - 35, size: 11, font: bold, color: white,
    maxWidth: 180, lineHeight: 14,
  });
  const dateStr = new Date(paymentValue.paidAt).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  page.drawText(dateStr, {
    x: invX - 90, y: height - 55, size: 9, font: regular, color: rgb(1, 0.8, 0.8),
  });

  let y = height - 110;

  // Line items table header
  page.drawRectangle({ x: 40, y: y - 6, width: width - 80, height: 22, color: lightGray });
  page.drawText('ITEM', { x: 50, y, size: 9, font: bold, color: muted });
  page.drawText('QTY', { x: 360, y, size: 9, font: bold, color: muted });
  page.drawText('UNIT PRICE', { x: 400, y, size: 9, font: bold, color: muted });
  page.drawText('TOTAL', { x: 500, y, size: 9, font: bold, color: muted });

  y -= 20;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 16;

  // Line items
  for (const item of paymentValue.lineItems) {
    const lineTotal = item.unitPrice * item.quantity;
    page.drawText(item.name, { x: 50, y, size: 10, font: regular, color: dark, maxWidth: 290 });
    if (item.description) {
      page.drawText(item.description, { x: 50, y: y - 13, size: 8, font: regular, color: muted, maxWidth: 290 });
      y -= 13;
    }
    page.drawText(String(item.quantity), { x: 368, y, size: 10, font: regular, color: dark });
    page.drawText(`$${item.unitPrice.toFixed(2)}`, { x: 402, y, size: 10, font: regular, color: dark });
    page.drawText(`$${lineTotal.toFixed(2)}`, { x: 500, y, size: 10, font: bold, color: dark });
    y -= 24;
    page.drawLine({ start: { x: 40, y: y + 6 }, end: { x: width - 40, y: y + 6 }, thickness: 0.3, color: rgb(0.92, 0.92, 0.92) });
  }

  y -= 10;

  // Totals box
  const totalsX = width - 200;
  const addTotalRow = (label: string, value: string, isBold = false, color = dark) => {
    page.drawText(label, { x: totalsX, y, size: 10, font: isBold ? bold : regular, color });
    page.drawText(value, { x: width - 40, y, size: 10, font: isBold ? bold : regular, color, maxWidth: 80 });
    y -= 18;
  };

  addTotalRow('Subtotal', `$${paymentValue.subtotal.toFixed(2)} ${paymentValue.currency}`);
  if (paymentValue.discount > 0) {
    addTotalRow('Discount', `−$${paymentValue.discount.toFixed(2)}`, false, rgb(0.2, 0.6, 0.3));
  }
  if (paymentValue.tax > 0) {
    const taxLabel = config.taxLabel || 'Tax';
    addTotalRow(taxLabel, `$${paymentValue.tax.toFixed(2)}`);
  }
  // Divider before total
  page.drawLine({ start: { x: totalsX, y: y + 12 }, end: { x: width - 40, y: y + 12 }, thickness: 1, color: primary });
  y -= 6;
  page.drawText('TOTAL PAID', { x: totalsX, y, size: 13, font: bold, color: primary });
  page.drawText(`$${paymentValue.total.toFixed(2)} ${paymentValue.currency}`, {
    x: width - 40, y, size: 13, font: bold, color: primary, maxWidth: 120,
  });

  y -= 40;

  // Transaction info
  page.drawText('Payment Details', { x: 40, y, size: 10, font: bold, color: muted });
  y -= 16;
  page.drawText(`Transaction ID: ${paymentValue.transactionId}`, { x: 40, y, size: 9, font: regular, color: dark });
  y -= 14;
  page.drawText(`Order ID: ${paymentValue.orderId}`, { x: 40, y, size: 9, font: regular, color: dark });
  y -= 14;
  page.drawText('Payment Method: PayPal', { x: 40, y, size: 9, font: regular, color: dark });
  y -= 14;
  page.drawText(`Paid on: ${new Date(paymentValue.paidAt).toLocaleString('en-CA')}`, { x: 40, y, size: 9, font: regular, color: dark });

  // Footer
  const footer = config.receiptFooter || 'Thank you for your payment. This is an official receipt.';
  page.drawLine({ start: { x: 40, y: 50 }, end: { x: width - 40, y: 50 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  page.drawText(footer, { x: 40, y: 35, size: 8, font: regular, color: muted, maxWidth: width - 80 });
  page.drawText('Generated by SCAGO Portal', { x: 40, y: 20, size: 7, font: regular, color: rgb(0.75, 0.75, 0.75) });

  return doc.save();
}

function downloadBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ---------------------------------------------------------------------------
// Success / confirmation panel
// ---------------------------------------------------------------------------
function SuccessPanel({
  paymentValue,
  config,
}: {
  paymentValue: PaymentValue;
  config: PaymentConfig;
}) {
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);

  const qrPayload = JSON.stringify({
    invoiceId: paymentValue.invoiceId,
    transactionId: paymentValue.transactionId,
    total: paymentValue.total,
    currency: paymentValue.currency,
    paidAt: paymentValue.paidAt,
    org: config.organizationName || 'SCAGO',
  });

  const handleDownloadReceipt = async () => {
    setReceiptLoading(true);
    try {
      const bytes = await generateReceiptPdf(paymentValue, config);
      downloadBytes(bytes, `${paymentValue.invoiceId}.pdf`);
    } catch (e) {
      console.error('Receipt generation failed:', e);
    } finally {
      setReceiptLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
          <Check className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-green-800">Payment Successful!</p>
          <p className="text-sm text-green-700 mt-0.5">
            {fmtMoney(paymentValue.total, paymentValue.currency)} paid via PayPal
          </p>
          <p className="text-xs text-green-500 mt-1 truncate font-mono">
            {paymentValue.invoiceId} · TX: {paymentValue.transactionId}
          </p>
        </div>
      </div>

      {/* Order Summary */}
      <div className="border rounded-lg divide-y text-sm">
        {paymentValue.lineItems.map((item) => (
          <div key={item.id} className="flex justify-between px-4 py-2.5">
            <span className="text-muted-foreground">
              {item.name} ×{item.quantity}
            </span>
            <span className="font-medium tabular-nums">
              {fmtMoney(item.unitPrice * item.quantity, paymentValue.currency)}
            </span>
          </div>
        ))}
        {paymentValue.discount > 0 && (
          <div className="flex justify-between px-4 py-2.5 text-green-700">
            <span>Discount</span>
            <span className="font-medium tabular-nums">−{fmtMoney(paymentValue.discount, paymentValue.currency)}</span>
          </div>
        )}
        {paymentValue.tax > 0 && (
          <div className="flex justify-between px-4 py-2.5 text-muted-foreground">
            <span>{config.taxLabel || 'Tax'}</span>
            <span className="tabular-nums">{fmtMoney(paymentValue.tax, paymentValue.currency)}</span>
          </div>
        )}
        <div className="flex justify-between px-4 py-3 font-semibold bg-muted/30">
          <span>Total</span>
          <span className="tabular-nums">{fmtMoney(paymentValue.total, paymentValue.currency)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {config.generateReceipt !== false && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadReceipt}
            disabled={receiptLoading}
          >
            {receiptLoading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-1.5" />
            )}
            Download Receipt (PDF)
          </Button>
        )}
        {config.generateQRTicket !== false && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQrVisible((v) => !v)}
          >
            <QrCode className="h-4 w-4 mr-1.5" />
            {qrVisible ? 'Hide' : 'Show'} QR Ticket
          </Button>
        )}
      </div>

      {/* QR Ticket */}
      {qrVisible && (
        <div className="border rounded-xl p-4 bg-white flex flex-col items-center gap-3 text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Payment QR Ticket
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl(qrPayload, 200)}
            alt="Payment QR code"
            className="w-44 h-44 rounded border"
          />
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p className="font-mono font-semibold">{paymentValue.invoiceId}</p>
            <p>{fmtMoney(paymentValue.total, paymentValue.currency)}</p>
            <p>{new Date(paymentValue.paidAt).toLocaleDateString('en-CA')}</p>
          </div>
          <a
            href={qrDataUrl(qrPayload, 400)}
            download={`${paymentValue.invoiceId}-qr.png`}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Download className="h-3 w-3" /> Save QR Code
          </a>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PayPalPayment({
  config,
  value,
  onChange,
  clientId,
  disabled = false,
}: PayPalPaymentProps) {
  const currency = config.currency || 'CAD';
  const taxRate = config.taxRate ?? 0;

  // --- State ---
  const [items, setItems] = useState<PaymentLineItem[]>(() => {
    if (value) return value.lineItems;
    return (config.lineItems || []).map((i) => ({ ...i, id: i.id || genId() }));
  });
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(
    value?.promoCode ?? null,
  );
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [capturedValue, setCapturedValue] = useState<PaymentValue | null>(null);

  const { subtotal, discount, tax, total } = calcTotals(items, appliedPromo, taxRate);

  const paypalClientId =
    clientId ||
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID : undefined) ||
    '';

  const { sdk, loading: sdkLoading, error: sdkError } = usePayPalV6(paypalClientId || undefined);
  const [paymentInProgress, setPaymentInProgress] = useState(false);

  // --- Handlers ---
  const updateQty = useCallback((itemId: string, qty: number) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity: qty } : i)));
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const addItem = useCallback((item: PaymentLineItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const handleApprove = useCallback(
    async (data: { orderId: string }) => {
      try {
        const result = await captureOrder(data.orderId);

        const pv: PaymentValue = {
          lineItems: items,
          promoCode: appliedPromo ?? undefined,
          subtotal,
          discount,
          tax,
          total,
          currency,
          transactionId: result.captureId,
          orderId: data.orderId,
          invoiceId: genInvoiceId(),
          paidAt: new Date().toISOString(),
          status: 'paid',
        };

        setCapturedValue(pv);
        setIsPaid(true);
        onChange?.(pv);
      } catch (err) {
        console.error('[PayPal] Capture error:', err);
        setPaypalError(err instanceof Error ? err.message : 'Payment capture failed.');
      } finally {
        setPaymentInProgress(false);
      }
    },
    [items, appliedPromo, subtotal, discount, tax, total, currency, onChange],
  );

  // --- Already paid ---
  const paidInfo = capturedValue || (value?.status === 'paid' ? value : null);
  if (isPaid || (value?.status === 'paid')) {
    return (
      <SuccessPanel
        paymentValue={paidInfo!}
        config={config}
      />
    );
  }

  const hasItems = items.length > 0 && total > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      {config.title && (
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base">{config.title}</h3>
        </div>
      )}

      {/* Line items */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/40 border-b">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Order Items
          </p>
        </div>
        <div className="px-4 divide-y">
          {items.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground text-center">
              No items added yet. Add items below.
            </p>
          )}
          {items.map((item) => (
            <LineItemRow
              key={item.id}
              item={item}
              allowQtyEdit={config.allowQuantityEdit !== false}
              allowRemove={
                config.allowCustomItems !== false ||
                !config.lineItems?.some((li) => li.id === item.id)
              }
              onQtyChange={(qty) => updateQty(item.id, qty)}
              onRemove={() => removeItem(item.id)}
              currency={currency}
            />
          ))}
        </div>

        {/* Totals */}
        {items.length > 0 && (
          <div className="border-t bg-muted/20 px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{fmtMoney(subtotal, currency)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Discount</span>
                <span className="tabular-nums">−{fmtMoney(discount, currency)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{config.taxLabel || 'Tax'}</span>
                <span className="tabular-nums">{fmtMoney(tax, currency)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="tabular-nums text-primary">{fmtMoney(total, currency)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Add custom items */}
      {config.allowCustomItems !== false && !disabled && (
        <AddItemForm onAdd={addItem} currency={currency} />
      )}

      {/* Promo code */}
      {config.allowPromoCodes !== false && (config.promoCodes?.length ?? 0) > 0 && !disabled && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" /> Promo / Discount Code
          </Label>
          <PromoCodeInput
            validCodes={config.promoCodes!}
            applied={appliedPromo}
            onApply={setAppliedPromo}
            onRemove={() => setAppliedPromo(null)}
          />
        </div>
      )}

      {/* PayPal payment area */}
      {hasItems ? (
        <div className="border rounded-xl p-4 bg-muted/20 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Ready to Pay</p>
              <p className="text-xs text-muted-foreground">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Badge variant="outline" className="text-base font-bold tabular-nums px-3 py-1">
              {fmtMoney(total, currency)}
            </Badge>
          </div>

          {paypalError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>{paypalError}</p>
            </div>
          )}

          {paypalClientId ? (
            sdkLoading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm">Loading payment options...</span>
              </div>
            ) : sdkError || !sdk ? (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>{sdkError || 'Payment system unavailable. Please refresh and try again.'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={disabled || paymentInProgress}
                  onClick={() => {
                    if (!sdk || paymentInProgress) return;
                    setPaypalError(null);
                    setPaymentInProgress(true);
                    const session = sdk.createPayPalOneTimePaymentSession({
                      onApprove: handleApprove,
                      onCancel: () => setPaymentInProgress(false),
                      onError: (error) => {
                        console.error('[PayPal] Payment error:', error);
                        setPaypalError(error.message || 'PayPal encountered an error.');
                        setPaymentInProgress(false);
                      },
                    });
                    session.start(
                      { presentationMode: 'auto' },
                      createGenericOrder(total, currency, config.title || 'SCAGO Payment'),
                    ).catch((err: any) => {
                      console.error('[PayPal] Session start error:', err);
                      setPaypalError('Failed to start payment. Please try again.');
                      setPaymentInProgress(false);
                    });
                  }}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-150',
                    'bg-[#FFC439] hover:bg-[#f0b72d] text-[#003087] border border-[#FFC439]',
                    (disabled || paymentInProgress) && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {paymentInProgress ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.603c-.564 0-1.04.41-1.127.964L7.076 21.337z" />
                    </svg>
                  )}
                  Pay with PayPal
                </button>
              </div>
            )
          ) : (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>Payment system is not configured. Please contact support.</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Secure payments powered by PayPal
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg border border-dashed">
          <CreditCard className="h-4 w-4 flex-shrink-0" />
          <span>
            {items.length === 0
              ? 'Add at least one item above to proceed with payment.'
              : 'Total must be greater than $0.00 to proceed.'}
          </span>
        </div>
      )}
    </div>
  );
}
