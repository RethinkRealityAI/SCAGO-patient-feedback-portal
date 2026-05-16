# PayPal JS SDK v6 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace PayPal JS SDK v5 (`@paypal/react-paypal-js`) with v6 (script-loaded), move order creation/capture server-side, and enable all payment methods (PayPal, Pay Later, Venmo, Google Pay, Apple Pay).

**Architecture:** v6 SDK loads via script tag, initialized with `createInstance()`. Two new Next.js API routes handle server-side order creation and capture. A React hook manages SDK lifecycle. The component renders eligible payment methods using v6 web components and session APIs.

**Tech Stack:** Next.js App Router, PayPal JS SDK v6, TypeScript, Tailwind CSS

---

### Task 1: Create PayPal Server Utilities

**Files:**
- Create: `src/lib/paypal-server.ts`

- [ ] **Step 1: Create the server utility module**

This module provides shared PayPal API helpers used by both the API routes and the existing verification logic.

```ts
// src/lib/paypal-server.ts

function getPayPalApiBaseUrl(): string {
  const mode = (
    process.env.NEXT_PUBLIC_PAYPAL_MODE ||
    process.env.PAYPAL_MODE ||
    process.env.PAYPAL_ENV ||
    'sandbox'
  ).toLowerCase();
  return mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export function getPayPalScriptUrl(): string {
  const mode = (
    process.env.NEXT_PUBLIC_PAYPAL_MODE ||
    process.env.PAYPAL_MODE ||
    process.env.PAYPAL_ENV ||
    'sandbox'
  ).toLowerCase();
  return mode === 'live'
    ? 'https://www.paypal.com/web-sdk/v6/core'
    : 'https://www.sandbox.paypal.com/web-sdk/v6/core';
}

function getCredentials() {
  const clientId =
    process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'PayPal server credentials are missing. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.',
    );
  }
  return { clientId, clientSecret };
}

export async function getPayPalAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getCredentials();
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64',
  );

  const res = await fetch(`${getPayPalApiBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Unable to obtain PayPal access token (${res.status}): ${body}`,
    );
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error(
      'PayPal access token response did not include access_token.',
    );
  }
  return json.access_token;
}

export async function createPayPalOrder(input: {
  amount: string;
  currency: string;
  description: string;
}): Promise<string> {
  const accessToken = await getPayPalAccessToken();

  const res = await fetch(`${getPayPalApiBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: input.description,
          amount: {
            currency_code: input.currency,
            value: input.amount,
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            shipping_preference: 'NO_SHIPPING',
          },
        },
      },
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayPal create order failed (${res.status}): ${body}`);
  }

  const order = (await res.json()) as { id?: string };
  if (!order.id) {
    throw new Error('PayPal order response did not include id.');
  }
  return order.id;
}

export interface CaptureResult {
  captureId: string;
  status: string;
  amount: string;
  currency: string;
}

export async function capturePayPalOrder(
  orderId: string,
): Promise<CaptureResult> {
  const accessToken = await getPayPalAccessToken();

  const res = await fetch(
    `${getPayPalApiBaseUrl()}/v2/checkout/orders/${orderId}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayPal capture failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as any;
  const capture = data?.purchase_units?.[0]?.payments?.captures?.[0];

  if (!capture) {
    throw new Error('PayPal capture response missing capture details.');
  }

  return {
    captureId: capture.id,
    status: capture.status,
    amount: capture.amount?.value ?? '0',
    currency: capture.amount?.currency_code ?? 'CAD',
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/paypal-server.ts
git commit -m "feat: add PayPal server utilities for v6 SDK migration"
```

---

### Task 2: Create Order API Route

**Files:**
- Create: `src/app/api/paypal/create-order/route.ts`

- [ ] **Step 1: Create the API route**

```ts
// src/app/api/paypal/create-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MEMBERSHIP_PLAN_BY_ID } from '@/lib/membership-plans';
import { createPayPalOrder } from '@/lib/paypal-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId } = body;

    if (typeof planId !== 'string' || !planId.trim()) {
      return NextResponse.json(
        { error: 'Missing planId.' },
        { status: 400 },
      );
    }

    const plan = MEMBERSHIP_PLAN_BY_ID[planId];
    if (!plan) {
      return NextResponse.json(
        { error: `Unknown plan "${planId}".` },
        { status: 400 },
      );
    }

    const orderId = await createPayPalOrder({
      amount: plan.amount.toFixed(2),
      currency: plan.currency,
      description: `SCAGO ${plan.category} ${plan.durationYears} year Membership`,
    });

    return NextResponse.json({ orderId });
  } catch (error) {
    console.error('[PayPal] Create order error:', error);
    return NextResponse.json(
      { error: 'Failed to create PayPal order.' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/paypal/create-order/route.ts
git commit -m "feat: add server-side PayPal order creation API route"
```

---

### Task 3: Create Capture API Route

**Files:**
- Create: `src/app/api/paypal/capture-order/route.ts`

- [ ] **Step 1: Create the API route**

```ts
// src/app/api/paypal/capture-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { capturePayPalOrder } from '@/lib/paypal-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (typeof orderId !== 'string' || !orderId.trim()) {
      return NextResponse.json(
        { error: 'Missing orderId.' },
        { status: 400 },
      );
    }

    const result = await capturePayPalOrder(orderId);

    if (result.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: `Capture not completed (status: ${result.status}).` },
        { status: 422 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[PayPal] Capture order error:', error);
    return NextResponse.json(
      { error: 'Failed to capture PayPal order.' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/paypal/capture-order/route.ts
git commit -m "feat: add server-side PayPal order capture API route"
```

---

### Task 4: Create `usePayPalV6` Hook

**Files:**
- Create: `src/hooks/use-paypal-v6.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/use-paypal-v6.ts
'use client';

import { useEffect, useRef, useState } from 'react';

/** Shape of the SDK instance returned by window.paypal.createInstance() */
export interface PayPalV6Instance {
  findEligibleMethods: (opts?: {
    currencyCode?: string;
    countryCode?: string;
    amount?: string;
  }) => Promise<{
    isEligible: (method: string) => boolean;
  }>;
  createPayPalOneTimePaymentSession: (opts: PayPalSessionOpts) => PayPalSession;
  createPayLaterOneTimePaymentSession: (opts: PayPalSessionOpts) => PayPalSession;
  createVenmoOneTimePaymentSession: (opts: PayPalSessionOpts) => PayPalSession;
}

export interface PayPalSessionOpts {
  onApprove: (data: { orderId: string; payerId?: string }) => void | Promise<void>;
  onCancel?: (data: { orderId: string }) => void;
  onError?: (error: { code?: string; message?: string }) => void;
}

export interface PayPalSession {
  start: (
    opts: { presentationMode?: string },
    orderPromise: Promise<{ orderId: string }>,
  ) => Promise<void>;
}

declare global {
  interface Window {
    paypal?: {
      createInstance: (opts: {
        clientId: string;
        components?: string[];
        pageType?: string;
      }) => Promise<PayPalV6Instance>;
    };
  }
}

function getScriptUrl(): string {
  const mode = (
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_PAYPAL_MODE
      : undefined
  ) || 'sandbox';
  return mode === 'live'
    ? 'https://www.paypal.com/web-sdk/v6/core'
    : 'https://www.sandbox.paypal.com/web-sdk/v6/core';
}

export function usePayPalV6(clientId: string | undefined) {
  const [sdk, setSdk] = useState<PayPalV6Instance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (!clientId || initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        // Load script if not already present
        if (!window.paypal) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = getScriptUrl();
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () =>
              reject(new Error('Failed to load PayPal SDK script.'));
            document.head.appendChild(script);
          });
        }

        if (!window.paypal?.createInstance) {
          throw new Error('PayPal SDK loaded but createInstance not available.');
        }

        const instance = await window.paypal.createInstance({
          clientId,
          components: [
            'paypal-payments',
            'venmo-payments',
            'applepay-payments',
            'googlepay-payments',
          ],
          pageType: 'checkout',
        });

        if (!cancelled) {
          setSdk(instance);
          setLoading(false);
        }
      } catch (err) {
        console.error('[PayPal] SDK init error:', err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'PayPal SDK failed to load.',
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return { sdk, loading, error };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-paypal-v6.ts
git commit -m "feat: add usePayPalV6 hook for SDK v6 script loading and initialization"
```

---

### Task 5: Rewrite PayPal Membership Payment Component

**Files:**
- Rewrite: `src/components/paypal-membership-payment.tsx`

- [ ] **Step 1: Rewrite the component with v6 SDK integration**

Replace the entire file content:

```tsx
// src/components/paypal-membership-payment.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, Check, CreditCard, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SCAGO_MEMBERSHIP_PLANS,
  type MembershipPlan,
} from '@/lib/membership-plans';
import {
  usePayPalV6,
  type PayPalV6Instance,
  type PayPalSession,
} from '@/hooks/use-paypal-v6';

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
  value?: MembershipPaymentValue | null;
  onChange?: (value: MembershipPaymentValue) => void;
  clientId?: string;
  disabled?: boolean;
}

type EligibleMethods = {
  paypal: boolean;
  paylater: boolean;
  venmo: boolean;
};

async function createOrderForPlan(
  planId: string,
): Promise<{ orderId: string }> {
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

async function captureOrder(
  orderId: string,
): Promise<{ captureId: string; status: string; amount: string; currency: string }> {
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

export function PayPalMembershipPayment({
  value,
  onChange,
  clientId,
  disabled = false,
}: PayPalMembershipPaymentProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [capturedDetails, setCapturedDetails] =
    useState<MembershipPaymentValue | null>(null);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [eligible, setEligible] = useState<EligibleMethods>({
    paypal: false,
    paylater: false,
    venmo: false,
  });

  const paypalClientId =
    clientId ||
    (typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
      : undefined) ||
    '';

  const { sdk, loading: sdkLoading, error: sdkError } = usePayPalV6(
    paypalClientId || undefined,
  );

  const selectedPlan =
    SCAGO_MEMBERSHIP_PLANS.find((p) => p.id === selectedPlanId) ?? null;

  // Check eligibility when SDK is ready
  useEffect(() => {
    if (!sdk) return;
    (async () => {
      try {
        const methods = await sdk.findEligibleMethods({
          currencyCode: 'CAD',
        });
        setEligible({
          paypal: methods.isEligible('paypal'),
          paylater: methods.isEligible('paylater'),
          venmo: methods.isEligible('venmo'),
        });
      } catch (err) {
        console.error('[PayPal] Eligibility check failed:', err);
        // Default to showing PayPal only
        setEligible({ paypal: true, paylater: false, venmo: false });
      }
    })();
  }, [sdk]);

  const handleApprove = useCallback(
    async (data: { orderId: string }) => {
      if (!selectedPlan) return;
      try {
        const result = await captureOrder(data.orderId);

        const paymentData: MembershipPaymentValue = {
          planId: selectedPlan.id,
          plan: `${selectedPlan.category} - ${selectedPlan.durationYears} year Membership`,
          amount: selectedPlan.amount,
          currency: 'CAD',
          transactionId: result.captureId,
          orderId: data.orderId,
          status: 'paid',
          paidAt: new Date().toISOString(),
        };

        setCapturedDetails(paymentData);
        setIsPaid(true);
        onChange?.(paymentData);
      } catch (err) {
        console.error('[PayPal] Capture error:', err);
        setPaypalError(
          err instanceof Error
            ? err.message
            : 'Payment capture failed. Please try again.',
        );
      } finally {
        setPaymentInProgress(false);
      }
    },
    [selectedPlan, onChange],
  );

  const handleCancel = useCallback(() => {
    setPaymentInProgress(false);
    setPaypalError(null);
  }, []);

  const handleError = useCallback(
    (error: { code?: string; message?: string }) => {
      console.error('[PayPal] Payment error:', error);
      setPaypalError(
        error.message ||
          'PayPal encountered an error. Please try again or contact support.',
      );
      setPaymentInProgress(false);
    },
    [],
  );

  const startPayment = useCallback(
    (
      sessionCreator: (sdk: PayPalV6Instance) => PayPalSession,
    ) => {
      if (!sdk || !selectedPlan || paymentInProgress || disabled) return;
      setPaypalError(null);
      setPaymentInProgress(true);

      const session = sessionCreator(sdk);
      session
        .start(
          { presentationMode: 'auto' },
          createOrderForPlan(selectedPlan.id),
        )
        .catch((err: any) => {
          console.error('[PayPal] Session start error:', err);
          setPaypalError('Failed to start payment. Please try again.');
          setPaymentInProgress(false);
        });
    },
    [sdk, selectedPlan, paymentInProgress, disabled],
  );

  // ── Already paid ──────────────────────────────────────────────────────
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
            {paidInfo?.plan ?? ''} — ${paidInfo?.amount?.toFixed(2)}{' '}
            {paidInfo?.currency}
          </p>
          <p className="text-xs text-green-500 mt-1 truncate">
            Transaction ID: {paidInfo?.transactionId}
          </p>
        </div>
      </div>
    );
  }

  // ── Plan picker ──────────────────────────────────────────────────────
  const renderPlanGroup = (category: 'Individual' | 'Family') => (
    <div>
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {category} Membership
      </h4>
      <div className="space-y-2">
        {SCAGO_MEMBERSHIP_PLANS.filter((p) => p.category === category).map(
          (plan) => (
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
                (disabled || paymentInProgress) &&
                  'opacity-50 cursor-not-allowed',
              )}
            >
              <span className="text-sm font-medium">
                {plan.durationYears} year Membership
              </span>
              <span className="text-sm font-bold text-primary tabular-nums">
                ${plan.amount.toFixed(2)}&nbsp;CAD
              </span>
            </button>
          ),
        )}
      </div>
    </div>
  );

  // ── Payment buttons ──────────────────────────────────────────────────
  const sessionOpts = {
    onApprove: handleApprove,
    onCancel: handleCancel,
    onError: handleError,
  };

  const renderPaymentButtons = () => {
    if (sdkLoading) {
      return (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Loading payment options...</span>
        </div>
      );
    }

    if (sdkError || !sdk) {
      return (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            {sdkError ||
              'Payment system unavailable. Please refresh and try again.'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {/* PayPal Button */}
        {eligible.paypal && (
          <button
            type="button"
            disabled={disabled || paymentInProgress}
            onClick={() =>
              startPayment((s) =>
                s.createPayPalOneTimePaymentSession(sessionOpts),
              )
            }
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-150',
              'bg-[#FFC439] hover:bg-[#f0b72d] text-[#003087] border border-[#FFC439]',
              (disabled || paymentInProgress) &&
                'opacity-50 cursor-not-allowed',
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
        )}

        {/* Pay Later Button */}
        {eligible.paylater && (
          <button
            type="button"
            disabled={disabled || paymentInProgress}
            onClick={() =>
              startPayment((s) =>
                s.createPayLaterOneTimePaymentSession(sessionOpts),
              )
            }
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-150',
              'bg-white hover:bg-gray-50 text-[#003087] border-2 border-[#003087]',
              (disabled || paymentInProgress) &&
                'opacity-50 cursor-not-allowed',
            )}
          >
            {paymentInProgress ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.603c-.564 0-1.04.41-1.127.964L7.076 21.337z" />
              </svg>
            )}
            Pay Later
          </button>
        )}

        {/* Venmo Button */}
        {eligible.venmo && (
          <button
            type="button"
            disabled={disabled || paymentInProgress}
            onClick={() =>
              startPayment((s) =>
                s.createVenmoOneTimePaymentSession(sessionOpts),
              )
            }
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-150',
              'bg-[#008CFF] hover:bg-[#0074d4] text-white border border-[#008CFF]',
              (disabled || paymentInProgress) &&
                'opacity-50 cursor-not-allowed',
            )}
          >
            {paymentInProgress ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M19.865 0c.87 1.44 1.265 2.922 1.265 4.794 0 5.97-5.099 13.716-9.234 19.166H4.094L0 1.222l6.932-.604 2.19 17.544C11.582 13.37 13.76 7.622 13.76 4.37c0-1.69-.29-2.849-.667-3.765L19.865 0z" />
              </svg>
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

      {/* Payment area */}
      {selectedPlan ? (
        <div className="border rounded-xl p-4 bg-muted/20 space-y-4">
          {/* Selected plan summary */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">
                {selectedPlan.category} — {selectedPlan.durationYears} year
                Membership
              </p>
              <p className="text-xs text-muted-foreground">Selected plan</p>
            </div>
            <p className="text-xl font-bold text-primary tabular-nums">
              ${selectedPlan.amount.toFixed(2)}&nbsp;CAD
            </p>
          </div>

          {/* Error */}
          {paypalError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>{paypalError}</p>
            </div>
          )}

          {/* Payment buttons */}
          {paypalClientId ? (
            renderPaymentButtons()
          ) : (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>
                Payment system is not configured. Please contact support.
              </p>
            </div>
          )}

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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/paypal-membership-payment.tsx
git commit -m "feat: rewrite PayPal membership component for v6 SDK with all payment methods"
```

---

### Task 6: Update PayPal Verification to Use Shared Utilities

**Files:**
- Modify: `src/lib/paypal-verification.ts`

- [ ] **Step 1: Refactor to use shared `paypal-server.ts`**

Replace the entire file:

```ts
// src/lib/paypal-verification.ts
import { getPayPalAccessToken } from '@/lib/paypal-server';

export interface PayPalCaptureDetails {
  id: string;
  status: string;
  amount?: {
    currency_code?: string;
    value?: string;
  };
  seller_receivable_breakdown?: {
    gross_amount?: {
      currency_code?: string;
      value?: string;
    };
  };
}

function getPayPalApiBaseUrl(): string {
  const mode = (
    process.env.NEXT_PUBLIC_PAYPAL_MODE ||
    process.env.PAYPAL_MODE ||
    process.env.PAYPAL_ENV ||
    'sandbox'
  ).toLowerCase();
  return mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

function parseAmount(raw: string | number | undefined | null): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function amountMatches(expected: number, actual: number): boolean {
  return Math.abs(expected - actual) <= 0.01;
}

async function getCaptureDetails(
  captureId: string,
  accessToken: string,
): Promise<PayPalCaptureDetails> {
  const captureRes = await fetch(
    `${getPayPalApiBaseUrl()}/v2/payments/captures/${captureId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    },
  );

  if (!captureRes.ok) {
    const body = await captureRes.text();
    throw new Error(
      `Unable to fetch PayPal capture ${captureId} (${captureRes.status}): ${body}`,
    );
  }

  return (await captureRes.json()) as PayPalCaptureDetails;
}

export async function verifyPayPalCapture(input: {
  captureId: string;
  expectedAmount?: number;
  expectedCurrency?: string;
}): Promise<
  { ok: true; capture: PayPalCaptureDetails } | { ok: false; error: string }
> {
  try {
    const accessToken = await getPayPalAccessToken();
    const capture = await getCaptureDetails(input.captureId, accessToken);

    if (capture.status !== 'COMPLETED') {
      return {
        ok: false,
        error: `PayPal capture ${input.captureId} is not completed (status: ${capture.status || 'unknown'}).`,
      };
    }

    const captureAmount =
      capture.amount || capture.seller_receivable_breakdown?.gross_amount;
    const currency = (captureAmount?.currency_code || '').toUpperCase();
    const value = parseAmount(captureAmount?.value);

    if (
      input.expectedCurrency &&
      currency !== input.expectedCurrency.toUpperCase()
    ) {
      return {
        ok: false,
        error: `PayPal currency mismatch for ${input.captureId}. Expected ${input.expectedCurrency.toUpperCase()}, got ${currency || 'unknown'}.`,
      };
    }

    if (input.expectedAmount !== undefined) {
      if (value === null || !amountMatches(input.expectedAmount, value)) {
        return {
          ok: false,
          error: `PayPal amount mismatch for ${input.captureId}. Expected ${input.expectedAmount.toFixed(2)}, got ${value?.toFixed(2) ?? 'unknown'}.`,
        };
      }
    }

    return { ok: true, capture };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown PayPal verification error.',
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/paypal-verification.ts
git commit -m "refactor: use shared PayPal auth from paypal-server.ts in verification"
```

---

### Task 7: Remove Old SDK Package

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Uninstall the old React PayPal SDK wrapper**

Run:

```bash
npm uninstall @paypal/react-paypal-js
```

- [ ] **Step 2: Verify no other files import from the removed package**

Run:

```bash
grep -r "@paypal/react-paypal-js" src/
```

Expected: No matches (the only consumer was `paypal-membership-payment.tsx` which was rewritten in Task 5).

If `src/components/paypal-payment.tsx` also imports it, it needs the same v6 treatment. Check and address.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove @paypal/react-paypal-js (replaced by v6 SDK script)"
```

---

### Task 8: Update Environment Variables

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Update `.env.local` with all PayPal variables**

Add/update the PayPal section at the bottom of `.env.local`:

```env
# PayPal SDK v6 - SCAGO Membership Payments
# Get credentials from https://developer.paypal.com/dashboard/applications
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
# Set to "live" for production, "sandbox" for testing
NEXT_PUBLIC_PAYPAL_MODE=sandbox
```

- [ ] **Step 2: Add `NEXT_PUBLIC_PAYPAL_MODE=live` to Netlify (production context)**

This is done via Netlify MCP or dashboard. The `PAYPAL_MODE` env var already set on Netlify in an earlier fix works as a server-only fallback, but `NEXT_PUBLIC_PAYPAL_MODE` is needed for the client-side script URL selection.

- [ ] **Step 3: Commit**

```bash
git add .env.local
git commit -m "chore: update .env.local with PayPal v6 environment variables"
```

---

### Task 9: Handle `paypal-payment.tsx` (if it exists and uses v5)

**Files:**
- Check: `src/components/paypal-payment.tsx`

- [ ] **Step 1: Check if `paypal-payment.tsx` imports from `@paypal/react-paypal-js`**

Run:

```bash
grep -l "@paypal/react-paypal-js" src/components/paypal-payment.tsx 2>/dev/null
```

If it does, it also needs to be migrated to v6. Apply the same pattern as Task 5 but adapted for the generic payment component's interface (`PayPalPayment` vs `PayPalMembershipPayment`). The key difference is that the generic component may not validate against `MEMBERSHIP_PLAN_BY_ID` — its create-order route would accept an arbitrary amount.

If it does NOT import from the old package, skip this task.

- [ ] **Step 2: Commit if changes were made**

```bash
git add src/components/paypal-payment.tsx
git commit -m "feat: migrate paypal-payment component to v6 SDK"
```

---

### Task 10: Build Verification

- [ ] **Step 1: Run the build to verify everything compiles**

Run:

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors related to PayPal.

- [ ] **Step 2: Fix any type errors or import issues**

Address any errors found during the build.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build issues from PayPal v6 migration"
```
