'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Check, CreditCard, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SCAGO_MEMBERSHIP_PLANS,
  type MembershipPlan,
} from '@/lib/membership-plans';
import { usePayPalV6, type PayPalV6Instance, type PayPalSession } from '@/hooks/use-paypal-v6';

// ── Exported interfaces ──────────────────────────────────────────────────────

export interface MembershipPaymentValue {
  planId: string;
  plan: string;
  amount: number;
  currency: string;
  transactionId: string;
  orderId: string;
  status: 'paid';
  paidAt: string;
}

interface PayPalMembershipPaymentProps {
  /** Current form value -- set after a successful payment */
  value?: MembershipPaymentValue | null;
  /** Called with payment details once PayPal confirms the capture */
  onChange?: (value: MembershipPaymentValue) => void;
  /** Override PayPal Client ID (falls back to NEXT_PUBLIC_PAYPAL_CLIENT_ID) */
  clientId?: string;
  /** Whether the field is read-only (e.g. form is already submitted) */
  disabled?: boolean;
}

// ── Helper functions (not exported) ──────────────────────────────────────────

async function createOrderForPlan(planId: string): Promise<{ orderId: string }> {
  const res = await fetch('/api/paypal/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId }),
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

// ── SVG icons ────────────────────────────────────────────────────────────────

function PayPalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.603c-.564 0-1.04.41-1.127.964L7.076 21.337z" />
    </svg>
  );
}

function VenmoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.865 0c.87 1.44 1.265 2.922 1.265 4.794 0 5.97-5.099 13.716-9.234 19.166H4.094L0 1.222l6.932-.604 2.19 17.544C11.582 13.37 13.76 7.622 13.76 4.37c0-1.69-.29-2.849-.667-3.765L19.865 0z" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * PayPalMembershipPayment
 *
 * Renders a two-step membership payment widget:
 *   1. User picks a plan (Individual or Family x 1/3/5/10 years)
 *   2. PayPal v6 SDK payment buttons appear for the chosen amount
 *   3. On successful capture, the field value is set and a success banner shown
 */
export function PayPalMembershipPayment({
  value,
  onChange,
  clientId,
  disabled = false,
}: PayPalMembershipPaymentProps) {
  const paypalClientId =
    clientId ||
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID : undefined) ||
    '';

  const { sdk, loading: sdkLoading, error: sdkError } = usePayPalV6(paypalClientId || undefined);

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [capturedDetails, setCapturedDetails] = useState<MembershipPaymentValue | null>(null);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [eligible, setEligible] = useState<{ paypal: boolean; paylater: boolean; venmo: boolean }>({
    paypal: false,
    paylater: false,
    venmo: false,
  });

  const selectedPlan = SCAGO_MEMBERSHIP_PLANS.find((p) => p.id === selectedPlanId) ?? null;

  // ── Check eligibility once SDK is ready ────────────────────────────────────
  useEffect(() => {
    if (!sdk) return;

    let cancelled = false;

    sdk.findEligibleMethods({ currencyCode: 'CAD' }).then((result) => {
      if (cancelled) return;
      setEligible({
        paypal: result.isEligible('paypal'),
        paylater: result.isEligible('paylater'),
        venmo: result.isEligible('venmo'),
      });
    }).catch((err) => {
      console.error('[PayPal] findEligibleMethods error:', err);
      // Default to showing PayPal at minimum
      if (!cancelled) {
        setEligible({ paypal: true, paylater: false, venmo: false });
      }
    });

    return () => { cancelled = true; };
  }, [sdk]);

  // ── Start payment for a given method ───────────────────────────────────────
  const startPayment = useCallback(
    async (method: 'paypal' | 'paylater' | 'venmo') => {
      if (!sdk || !selectedPlan || paymentInProgress) return;

      setPaypalError(null);
      setPaymentInProgress(true);

      try {
        const sessionOpts = {
          onApprove: async (data: { orderId: string; payerId?: string }) => {
            try {
              const capture = await captureOrder(data.orderId);

              const paymentData: MembershipPaymentValue = {
                planId: selectedPlan.id,
                plan: `${selectedPlan.category} - ${selectedPlan.durationYears} year Membership`,
                amount: selectedPlan.amount,
                currency: capture.currency || 'CAD',
                transactionId: capture.captureId,
                orderId: data.orderId,
                status: 'paid',
                paidAt: new Date().toISOString(),
              };

              setCapturedDetails(paymentData);
              setIsPaid(true);
              onChange?.(paymentData);
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to capture payment.';
              console.error('[PayPal] capture error:', err);
              setPaypalError(message);
            } finally {
              setPaymentInProgress(false);
            }
          },
          onCancel: () => {
            setPaymentInProgress(false);
          },
          onError: (error: { code?: string; message?: string }) => {
            console.error('[PayPal] payment error:', error);
            setPaypalError(error.message || 'PayPal encountered an error. Please try again or contact support.');
            setPaymentInProgress(false);
          },
        };

        let session: PayPalSession;
        if (method === 'paylater') {
          session = sdk.createPayLaterOneTimePaymentSession(sessionOpts);
        } else if (method === 'venmo') {
          session = sdk.createVenmoOneTimePaymentSession(sessionOpts);
        } else {
          session = sdk.createPayPalOneTimePaymentSession(sessionOpts);
        }

        const orderPromise = createOrderForPlan(selectedPlan.id);

        await session.start(
          { presentationMode: 'popup' },
          orderPromise,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start payment.';
        console.error('[PayPal] startPayment error:', err);
        setPaypalError(message);
        setPaymentInProgress(false);
      }
    },
    [sdk, selectedPlan, paymentInProgress, onChange],
  );

  // ── Already paid ──────────────────────────────────────────────────────────
  const paidInfo = capturedDetails || value;
  if (isPaid || (value && value.status === 'paid')) {
    return (
      <div className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
          <Check className="h-5 w-5 text-green-600" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-green-800">Payment Successful!</p>
          <p className="text-sm text-green-700 mt-0.5">
            {paidInfo?.plan ?? ''} — ${paidInfo?.amount?.toFixed(2)} {paidInfo?.currency}
          </p>
          <p className="text-xs text-green-500 mt-1 truncate">
            Transaction ID: {paidInfo?.transactionId}
          </p>
        </div>
      </div>
    );
  }

  // ── Plan picker ────────────────────────────────────────────────────────────
  const renderPlanGroup = (category: 'Individual' | 'Family') => (
    <div>
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {category} Membership
      </h4>
      <div className="space-y-2">
        {SCAGO_MEMBERSHIP_PLANS.filter((p) => p.category === category).map((plan) => (
          <button
            key={plan.id}
            type="button"
            disabled={disabled || paymentInProgress}
            onClick={() => {
              setSelectedPlanId(plan.id);
              setPaypalError(null);
            }}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 text-left transition-all duration-150',
              selectedPlanId === plan.id
                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                : 'border-border bg-background hover:border-primary/50 hover:bg-muted/30',
              (disabled || paymentInProgress) && 'opacity-50 cursor-not-allowed',
            )}
          >
            <span className="text-sm font-medium">
              {plan.durationYears} year Membership
            </span>
            <span className="text-sm font-bold text-primary tabular-nums">
              ${plan.amount.toFixed(2)}&nbsp;CAD
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Render payment buttons ─────────────────────────────────────────────────
  const renderPaymentButtons = () => {
    // Missing client ID
    if (!paypalClientId) {
      return (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
          <p>Payment system is not configured. Please contact support.</p>
        </div>
      );
    }

    // SDK loading
    if (sdkLoading) {
      return (
        <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading payment options...</span>
        </div>
      );
    }

    // SDK error
    if (sdkError) {
      return (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>Failed to load payment system. Please refresh and try again.</p>
        </div>
      );
    }

    // SDK not available yet (shouldn't happen after loading is false, but guard)
    if (!sdk) return null;

    return (
      <div className="space-y-2">
        {eligible.paypal && (
          <button
            type="button"
            disabled={disabled || paymentInProgress}
            onClick={() => startPayment('paypal')}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border font-semibold text-sm transition-colors',
              'bg-[#FFC439] hover:bg-[#f0b72d] text-[#003087] border-[#FFC439]',
              (disabled || paymentInProgress) && 'opacity-60 cursor-not-allowed',
            )}
          >
            {paymentInProgress ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PayPalIcon className="h-5 w-5" />
            )}
            Pay with PayPal
          </button>
        )}

        {eligible.paylater && (
          <button
            type="button"
            disabled={disabled || paymentInProgress}
            onClick={() => startPayment('paylater')}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-semibold text-sm transition-colors',
              'bg-white hover:bg-gray-50 text-[#003087] border-[#003087]',
              (disabled || paymentInProgress) && 'opacity-60 cursor-not-allowed',
            )}
          >
            {paymentInProgress ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PayPalIcon className="h-5 w-5" />
            )}
            Pay Later
          </button>
        )}

        {eligible.venmo && (
          <button
            type="button"
            disabled={disabled || paymentInProgress}
            onClick={() => startPayment('venmo')}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border font-semibold text-sm transition-colors',
              'bg-[#008CFF] hover:bg-[#0074d4] text-white border-[#008CFF]',
              (disabled || paymentInProgress) && 'opacity-60 cursor-not-allowed',
            )}
          >
            {paymentInProgress ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <VenmoIcon className="h-5 w-5" />
            )}
            Pay with Venmo
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Plan selection grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {renderPlanGroup('Individual')}
        {renderPlanGroup('Family')}
      </div>

      {/* PayPal payment area */}
      {selectedPlan ? (
        <div className="border rounded-xl p-4 bg-muted/20 space-y-4">
          {/* Selected plan summary */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">
                {selectedPlan.category} — {selectedPlan.durationYears} year Membership
              </p>
              <p className="text-xs text-muted-foreground">Selected plan</p>
            </div>
            <p className="text-xl font-bold text-primary tabular-nums">
              ${selectedPlan.amount.toFixed(2)}&nbsp;CAD
            </p>
          </div>

          {/* PayPal error */}
          {paypalError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>{paypalError}</p>
            </div>
          )}

          {/* Payment buttons */}
          {renderPaymentButtons()}

          <p className="text-xs text-muted-foreground text-center">
            Secure payments powered by PayPal
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg border border-dashed">
          <CreditCard className="h-4 w-4 flex-shrink-0" />
          <span>Select a membership plan above to proceed with payment</span>
        </div>
      )}
    </div>
  );
}
