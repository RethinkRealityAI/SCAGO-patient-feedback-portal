'use client';

import { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { Check, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SCAGO_MEMBERSHIP_PLANS,
  type MembershipPlan,
} from '@/lib/membership-plans';

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
  /** Current form value – set after a successful payment */
  value?: MembershipPaymentValue | null;
  /** Called with payment details once PayPal confirms the capture */
  onChange?: (value: MembershipPaymentValue) => void;
  /** Override PayPal Client ID (falls back to NEXT_PUBLIC_PAYPAL_CLIENT_ID) */
  clientId?: string;
  /** Whether the field is read-only (e.g. form is already submitted) */
  disabled?: boolean;
}

/**
 * Renders nothing but emits a console warning when the PayPal client ID is
 * missing from the environment. This keeps the UI clean while still alerting
 * developers during local development.
 */
function MissingClientIdWarning() {
  console.warn(
    '[PayPalMembershipPayment] NEXT_PUBLIC_PAYPAL_CLIENT_ID is not set. ' +
    'PayPal buttons will not render until the environment variable is configured.',
  );
  return null;
}

/**
 * PayPalMembershipPayment
 *
 * Renders a two-step membership payment widget:
 *   1. User picks a plan (Individual or Family × 1/3/5/10 years)
 *   2. PayPal Smart Payment Buttons appear for the chosen amount
 *   3. On successful capture, the field value is set and a success banner shown
 */
export function PayPalMembershipPayment({
  value,
  onChange,
  clientId,
  disabled = false,
}: PayPalMembershipPaymentProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [capturedDetails, setCapturedDetails] = useState<MembershipPaymentValue | null>(null);
  const [paypalError, setPaypalError] = useState<string | null>(null);

  const paypalClientId =
    clientId ||
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID : undefined) ||
    '';

  const selectedPlan = SCAGO_MEMBERSHIP_PLANS.find((p) => p.id === selectedPlanId) ?? null;

  // ── Already paid ────────────────────────────────────────────────────────
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

  // ── Plan picker ──────────────────────────────────────────────────────────
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
            disabled={disabled}
            onClick={() => {
              setSelectedPlanId(plan.id);
              setPaypalError(null);
            }}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 text-left transition-all duration-150',
              selectedPlanId === plan.id
                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                : 'border-border bg-background hover:border-primary/50 hover:bg-muted/30',
              disabled && 'opacity-50 cursor-not-allowed',
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

          {/* PayPal buttons or missing-config notice */}
          {paypalClientId ? (
            /* key forces PayPal to re-mount when plan or clientId changes */
            <div key={`${paypalClientId}-${selectedPlanId}`}>
              <PayPalScriptProvider
                options={{
                  clientId: paypalClientId,
                  currency: 'CAD',
                  components: 'buttons',
                }}
              >
                <PayPalButtons
                  style={{ layout: 'vertical', shape: 'rect', tagline: false }}
                  disabled={disabled}
                  createOrder={(_data, actions) =>
                    actions.order.create({
                      intent: 'CAPTURE',
                      purchase_units: [
                        {
                          description: `SCAGO ${selectedPlan.category} ${selectedPlan.durationYears} year Membership`,
                          amount: {
                            currency_code: 'CAD',
                            value: selectedPlan.amount.toFixed(2),
                          },
                        },
                      ],
                      application_context: {
                        shipping_preference: 'NO_SHIPPING',
                      },
                    } as any)
                  }
                  onApprove={(_data, actions) =>
                    (actions.order as any).capture().then((details: any) => {
                      const txId: string =
                        details?.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
                        _data.orderID;

                      const paymentData: MembershipPaymentValue = {
                        planId: selectedPlan.id,
                        plan: `${selectedPlan.category} - ${selectedPlan.durationYears} year Membership`,
                        amount: selectedPlan.amount,
                        currency: 'CAD',
                        transactionId: txId,
                        orderId: _data.orderID,
                        status: 'paid',
                        paidAt: new Date().toISOString(),
                      };

                      setCapturedDetails(paymentData);
                      setIsPaid(true);
                      onChange?.(paymentData);
                    })
                  }
                  onError={(err) => {
                    console.error('PayPal Error:', err);
                    setPaypalError(
                      'PayPal encountered an error. Please try again or contact support.',
                    );
                  }}
                />
              </PayPalScriptProvider>
            </div>
          ) : (
            // Client ID not available – log a warning and render nothing
            // (NEXT_PUBLIC_PAYPAL_CLIENT_ID must be set in the environment)
            <MissingClientIdWarning />
          )}

          <p className="text-xs text-muted-foreground text-center">
            🔒 Safe and secure payments powered by PayPal
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