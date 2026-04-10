'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  type ApplePayPayPalSession,
  type CardFieldsSession,
} from '@/hooks/use-paypal-v6';

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

// ── Helper functions ─────────────────────────────────────────────────────────

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
): Promise<{
  captureId: string;
  status: string;
  amount: string;
  currency: string;
}> {
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

function buildPaymentValue(
  plan: MembershipPlan,
  orderId: string,
  captureId: string,
  currency: string,
): MembershipPaymentValue {
  return {
    planId: plan.id,
    plan: `${plan.category} - ${plan.durationYears} year Membership`,
    amount: plan.amount,
    currency: currency || 'CAD',
    transactionId: captureId,
    orderId,
    status: 'paid',
    paidAt: new Date().toISOString(),
  };
}

// ── SVG icons ────────────────────────────────────────────────────────────────

function PayPalIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.603c-.564 0-1.04.41-1.127.964L7.076 21.337z" />
    </svg>
  );
}

function VenmoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.865 0c.87 1.44 1.265 2.922 1.265 4.794 0 5.97-5.099 13.716-9.234 19.166H4.094L0 1.222l6.932-.604 2.19 17.544C11.582 13.37 13.76 7.622 13.76 4.37c0-1.69-.29-2.849-.667-3.765L19.865 0z" />
    </svg>
  );
}

function ApplePayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

// ── Google Pay sub-component ─────────────────────────────────────────────────

function GooglePayButton({
  sdk,
  plan,
  onPaymentComplete,
  onError,
  disabled,
}: {
  sdk: PayPalV6Instance;
  plan: MembershipPlan;
  onPaymentComplete: (data: MembershipPaymentValue) => void;
  onError: (msg: string) => void;
  disabled: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Refs for latest values inside async callbacks
  const planRef = useRef(plan);
  planRef.current = plan;
  const onCompleteRef = useRef(onPaymentComplete);
  onCompleteRef.current = onPaymentComplete;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      // Load Google Pay JS if not already loaded
      if (!window.google?.payments?.api?.PaymentsClient) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector(
            'script[src*="pay.google.com"]',
          );
          if (existing) {
            existing.addEventListener('load', () => resolve());
            // If already loaded, resolve immediately
            if ((existing as HTMLScriptElement).dataset.loaded === '1') {
              resolve();
              return;
            }
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://pay.google.com/gp/p/js/pay.js';
          script.async = true;
          script.onload = () => {
            script.dataset.loaded = '1';
            resolve();
          };
          script.onerror = () =>
            reject(new Error('Failed to load Google Pay JS'));
          document.head.appendChild(script);
        });
      }

      if (cancelled || !window.google?.payments?.api?.PaymentsClient) return;

      let googlePaySession;
      try {
        googlePaySession = sdk.createGooglePayOneTimePaymentSession();
      } catch {
        // Google Pay not available on this SDK instance
        return;
      }

      const googlePayConfig = await googlePaySession.getGooglePayConfig();

      const environment =
        process.env.NEXT_PUBLIC_PAYPAL_MODE === 'live' ? 'PRODUCTION' : 'TEST';

      const paymentsClient = new window.google.payments.api.PaymentsClient({
        environment,
        paymentDataCallbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onPaymentAuthorized: async (paymentData: any) => {
            try {
              setProcessing(true);
              const currentPlan = planRef.current;
              const { orderId } = await createOrderForPlan(currentPlan.id);

              const confirmResult = await googlePaySession.confirmOrder({
                orderId,
                paymentMethodData: paymentData.paymentMethodData,
              });

              if (confirmResult.status === 'APPROVED') {
                const capture = await captureOrder(orderId);
                onCompleteRef.current(
                  buildPaymentValue(
                    currentPlan,
                    orderId,
                    capture.captureId,
                    capture.currency,
                  ),
                );
                return { transactionState: 'SUCCESS' };
              }

              onErrorRef.current('Google Pay payment was not approved.');
              return {
                transactionState: 'ERROR',
                error: {
                  reason: 'PAYMENT_DATA_INVALID',
                  message: 'Payment not approved',
                  intent: 'PAYMENT_AUTHORIZATION',
                },
              };
            } catch (err) {
              const msg =
                err instanceof Error
                  ? err.message
                  : 'Google Pay payment failed.';
              console.error('[GooglePay] error:', err);
              onErrorRef.current(msg);
              return {
                transactionState: 'ERROR',
                error: {
                  reason: 'OTHER_ERROR',
                  message: msg,
                  intent: 'PAYMENT_AUTHORIZATION',
                },
              };
            } finally {
              setProcessing(false);
            }
          },
        },
      });

      const isReadyToPay = await paymentsClient.isReadyToPay({
        allowedPaymentMethods: googlePayConfig.allowedPaymentMethods,
        apiVersion: googlePayConfig.apiVersion,
        apiVersionMinor: googlePayConfig.apiVersionMinor,
      });

      if (cancelled) return;

      if (isReadyToPay.result && containerRef.current) {
        const button = paymentsClient.createButton({
          onClick: () => {
            const currentPlan = planRef.current;
            paymentsClient.loadPaymentData({
              ...googlePayConfig,
              transactionInfo: {
                totalPriceStatus: 'FINAL',
                totalPrice: currentPlan.amount.toFixed(2),
                currencyCode: 'CAD',
                countryCode: 'CA',
              },
              callbackIntents: ['PAYMENT_AUTHORIZATION'],
            });
          },
          buttonColor: 'default',
          buttonType: 'pay',
          buttonSizeMode: 'fill',
        });

        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(button);
        setReady(true);
      }
    };

    setup().catch((err) => {
      console.error('[GooglePay] setup failed:', err);
    });

    return () => {
      cancelled = true;
    };
  }, [sdk]);

  if (!ready) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-full [&_button]:!w-full [&_button]:!rounded-lg [&_button]:!min-h-[44px]',
        (disabled || processing) && 'opacity-60 pointer-events-none',
      )}
    />
  );
}

// ── Apple Pay sub-component ──────────────────────────────────────────────────

function ApplePayButton({
  sdk,
  plan,
  onPaymentComplete,
  onError,
  disabled,
}: {
  sdk: PayPalV6Instance;
  plan: MembershipPlan;
  onPaymentComplete: (data: MembershipPaymentValue) => void;
  onError: (msg: string) => void;
  disabled: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);

  const planRef = useRef(plan);
  planRef.current = plan;
  const onCompleteRef = useRef(onPaymentComplete);
  onCompleteRef.current = onPaymentComplete;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const paypalSessionRef = useRef<ApplePayPayPalSession | null>(null);
  const configRef = useRef<{
    merchantCapabilities: string[];
    supportedNetworks: string[];
  } | null>(null);

  useEffect(() => {
    // Apple Pay only works in Safari
    if (!window.ApplePaySession?.canMakePayments?.()) return;

    let cancelled = false;

    const setup = async () => {
      try {
        const session = await sdk.createApplePayOneTimePaymentSession();
        const config = await session.config();

        if (cancelled) return;

        paypalSessionRef.current = session;
        configRef.current = config;
        setReady(true);
      } catch (err) {
        console.error('[ApplePay] setup failed:', err);
      }
    };

    setup();

    return () => {
      cancelled = true;
    };
  }, [sdk]);

  const handleClick = useCallback(async () => {
    if (!paypalSessionRef.current || !configRef.current || processing) return;

    setProcessing(true);
    const currentPlan = planRef.current;

    try {
      const paymentRequest = {
        countryCode: 'CA',
        currencyCode: 'CAD',
        total: {
          label: 'SCAGO Membership',
          amount: currentPlan.amount.toFixed(2),
          type: 'final',
        },
        requiredBillingContactFields: ['name', 'email', 'postalAddress'],
        merchantCapabilities: configRef.current.merchantCapabilities,
        supportedNetworks: configRef.current.supportedNetworks,
      };

      const appleSession = new window.ApplePaySession!(4, paymentRequest);
      const paypalSession = paypalSessionRef.current;

      appleSession.onvalidatemerchant = async (event) => {
        try {
          const merchantSession = await paypalSession.validateMerchant({
            validationUrl: event.validationURL,
            displayName: 'SCAGO',
          });
          appleSession.completeMerchantValidation(merchantSession);
        } catch (err) {
          console.error('[ApplePay] merchant validation failed:', err);
          appleSession.abort();
          setProcessing(false);
        }
      };

      appleSession.onpaymentauthorized = async (event) => {
        try {
          const { orderId } = await createOrderForPlan(currentPlan.id);
          const confirmResult = await paypalSession.confirmOrder({
            orderId,
            token: event.payment.token,
            billingContact: event.payment.billingContact,
          });

          if (confirmResult.status === 'APPROVED') {
            const capture = await captureOrder(orderId);
            appleSession.completePayment(
              window.ApplePaySession!.STATUS_SUCCESS,
            );
            onCompleteRef.current(
              buildPaymentValue(
                currentPlan,
                orderId,
                capture.captureId,
                capture.currency,
              ),
            );
          } else {
            appleSession.completePayment(
              window.ApplePaySession!.STATUS_FAILURE,
            );
            onErrorRef.current('Apple Pay payment was not approved.');
          }
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : 'Apple Pay payment failed.';
          console.error('[ApplePay] payment error:', err);
          appleSession.completePayment(window.ApplePaySession!.STATUS_FAILURE);
          onErrorRef.current(msg);
        } finally {
          setProcessing(false);
        }
      };

      appleSession.oncancel = () => {
        setProcessing(false);
      };

      appleSession.begin();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to start Apple Pay.';
      console.error('[ApplePay] error:', err);
      onErrorRef.current(msg);
      setProcessing(false);
    }
  }, [processing]);

  if (!ready) return null;

  return (
    <button
      type="button"
      disabled={disabled || processing}
      onClick={handleClick}
      className={cn(
        'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border font-semibold text-sm transition-colors',
        'bg-black hover:bg-gray-900 text-white border-black',
        (disabled || processing) && 'opacity-60 cursor-not-allowed',
      )}
    >
      {processing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ApplePayIcon className="h-5 w-5" />
      )}
       Pay
    </button>
  );
}

// ── Card Fields sub-component ────────────────────────────────────────────────

function CardFieldsForm({
  sdk,
  plan,
  onPaymentComplete,
  onError,
  disabled,
}: {
  sdk: PayPalV6Instance;
  plan: MembershipPlan;
  onPaymentComplete: (data: MembershipPaymentValue) => void;
  onError: (msg: string) => void;
  disabled: boolean;
}) {
  const numberRef = useRef<HTMLDivElement>(null);
  const expiryRef = useRef<HTMLDivElement>(null);
  const cvvRef = useRef<HTMLDivElement>(null);
  const cardSessionRef = useRef<CardFieldsSession | null>(null);
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);

  const planRef = useRef(plan);
  planRef.current = plan;

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      // Give refs a tick to mount
      await new Promise((r) => setTimeout(r, 50));

      if (
        cancelled ||
        !numberRef.current ||
        !expiryRef.current ||
        !cvvRef.current
      )
        return;

      try {
        const cardSession = sdk.createCardFieldsOneTimePaymentSession();
        cardSessionRef.current = cardSession;

        const numberField = cardSession.createCardFieldsComponent({
          type: 'number',
          placeholder: 'Card number',
        });
        const expiryField = cardSession.createCardFieldsComponent({
          type: 'expiry',
          placeholder: 'MM / YY',
        });
        const cvvField = cardSession.createCardFieldsComponent({
          type: 'cvv',
          placeholder: 'CVV',
        });

        numberRef.current.innerHTML = '';
        expiryRef.current.innerHTML = '';
        cvvRef.current.innerHTML = '';

        numberRef.current.appendChild(numberField);
        expiryRef.current.appendChild(expiryField);
        cvvRef.current.appendChild(cvvField);

        setReady(true);
      } catch (err) {
        console.error('[CardFields] setup failed:', err);
      }
    };

    setup();

    return () => {
      cancelled = true;
    };
  }, [sdk]);

  const handleSubmit = useCallback(async () => {
    if (!cardSessionRef.current || processing) return;

    setProcessing(true);
    const currentPlan = planRef.current;

    try {
      const { orderId } = await createOrderForPlan(currentPlan.id);
      const { data, state } = await cardSessionRef.current.submit(orderId);

      if (state === 'succeeded') {
        const capture = await captureOrder(data.orderId);
        onPaymentComplete(
          buildPaymentValue(
            currentPlan,
            data.orderId,
            capture.captureId,
            capture.currency,
          ),
        );
      } else {
        onError('Card payment was not completed. Please try again.');
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Card payment failed.';
      console.error('[CardFields] payment error:', err);
      onError(msg);
    } finally {
      setProcessing(false);
    }
  }, [processing, onPaymentComplete, onError]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <CreditCard className="h-4 w-4" />
        <span>Credit or Debit Card</span>
      </div>

      <div className="space-y-2">
        {/* Card number */}
        <div
          ref={numberRef}
          className="min-h-[44px] rounded-lg border bg-background px-1 [&_iframe]:!min-h-[42px] [&_iframe]:!w-full"
        />
        {/* Expiry + CVV side-by-side */}
        <div className="grid grid-cols-2 gap-2">
          <div
            ref={expiryRef}
            className="min-h-[44px] rounded-lg border bg-background px-1 [&_iframe]:!min-h-[42px] [&_iframe]:!w-full"
          />
          <div
            ref={cvvRef}
            className="min-h-[44px] rounded-lg border bg-background px-1 [&_iframe]:!min-h-[42px] [&_iframe]:!w-full"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={disabled || processing || !ready}
        onClick={handleSubmit}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border font-semibold text-sm transition-colors',
          'bg-primary hover:bg-primary/90 text-primary-foreground border-primary',
          (disabled || processing || !ready) && 'opacity-60 cursor-not-allowed',
        )}
      >
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            Pay ${plan.amount.toFixed(2)} CAD
          </>
        )}
      </button>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

/**
 * PayPalMembershipPayment
 *
 * Renders a two-step membership payment widget:
 *   1. User picks a plan (Individual or Family x 1/3/5/10 years)
 *   2. Payment options appear: PayPal, Pay Later, Venmo, Google Pay,
 *      Apple Pay, PayPal Credit, and Credit/Debit Card fields
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
    (typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
      : undefined) ||
    '';

  const {
    sdk,
    loading: sdkLoading,
    error: sdkError,
  } = usePayPalV6(paypalClientId || undefined);

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [capturedDetails, setCapturedDetails] =
    useState<MembershipPaymentValue | null>(null);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [eligible, setEligible] = useState<{
    paypal: boolean;
    paylater: boolean;
    venmo: boolean;
    credit: boolean;
    advancedCards: boolean;
  }>({
    paypal: false,
    paylater: false,
    venmo: false,
    credit: false,
    advancedCards: false,
  });

  const selectedPlan =
    SCAGO_MEMBERSHIP_PLANS.find((p) => p.id === selectedPlanId) ?? null;

  // ── Handle payment completion (shared by all methods) ─────────────────────
  const handlePaymentComplete = useCallback(
    (data: MembershipPaymentValue) => {
      setCapturedDetails(data);
      setIsPaid(true);
      setPaypalError(null);
      onChange?.(data);
    },
    [onChange],
  );

  // ── Check eligibility once SDK is ready ────────────────────────────────────
  useEffect(() => {
    if (!sdk) return;

    let cancelled = false;

    sdk
      .findEligibleMethods({ currencyCode: 'CAD' })
      .then((result) => {
        if (cancelled) return;
        const elig = {
          paypal: result.isEligible('paypal'),
          paylater: result.isEligible('paylater'),
          venmo: result.isEligible('venmo'),
          credit: result.isEligible('credit'),
          advancedCards: result.isEligible('advanced_cards'),
        };
        console.log('[PayPal] eligibility:', elig);
        setEligible(elig);
      })
      .catch((err) => {
        console.error('[PayPal] findEligibleMethods error:', err);
        if (!cancelled) {
          // Default: show PayPal + cards at minimum
          setEligible({
            paypal: true,
            paylater: false,
            venmo: false,
            credit: false,
            advancedCards: true,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sdk]);

  // ── Start payment for wallet methods (PayPal / Pay Later / Venmo / Credit)
  const startPayment = useCallback(
    async (method: 'paypal' | 'paylater' | 'venmo' | 'credit') => {
      if (!sdk || !selectedPlan || paymentInProgress) return;

      setPaypalError(null);
      setPaymentInProgress(true);

      try {
        const sessionOpts = {
          onApprove: async (data: {
            orderId: string;
            payerId?: string;
          }) => {
            try {
              const capture = await captureOrder(data.orderId);
              handlePaymentComplete(
                buildPaymentValue(
                  selectedPlan,
                  data.orderId,
                  capture.captureId,
                  capture.currency,
                ),
              );
            } catch (err) {
              const message =
                err instanceof Error
                  ? err.message
                  : 'Failed to capture payment.';
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
            setPaypalError(
              error.message ||
                'PayPal encountered an error. Please try again or contact support.',
            );
            setPaymentInProgress(false);
          },
        };

        let session: PayPalSession;
        if (method === 'paylater') {
          session = sdk.createPayLaterOneTimePaymentSession(sessionOpts);
        } else if (method === 'venmo') {
          session = sdk.createVenmoOneTimePaymentSession(sessionOpts);
        } else if (method === 'credit') {
          session = sdk.createPayPalCreditOneTimePaymentSession(sessionOpts);
        } else {
          session = sdk.createPayPalOneTimePaymentSession(sessionOpts);
        }

        const orderPromise = createOrderForPlan(selectedPlan.id);

        await session.start({ presentationMode: 'popup' }, orderPromise);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to start payment.';
        console.error('[PayPal] startPayment error:', err);
        setPaypalError(message);
        setPaymentInProgress(false);
      }
    },
    [sdk, selectedPlan, paymentInProgress, handlePaymentComplete],
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

  // ── Plan picker ────────────────────────────────────────────────────────────
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

  // ── Render payment methods ─────────────────────────────────────────────────
  const renderPaymentMethods = () => {
    if (!paypalClientId) {
      return (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
          <p>Payment system is not configured. Please contact support.</p>
        </div>
      );
    }

    if (sdkLoading) {
      return (
        <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading payment options...</span>
        </div>
      );
    }

    if (sdkError) {
      return (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>Failed to load payment system. Please refresh and try again.</p>
        </div>
      );
    }

    if (!sdk || !selectedPlan) return null;

    return (
      <div className="space-y-4">
        {/* ── Wallet / Express buttons ──────────────────────────────────── */}
        <div className="space-y-2">
          {eligible.paypal && (
            <button
              type="button"
              disabled={disabled || paymentInProgress}
              onClick={() => startPayment('paypal')}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border font-semibold text-sm transition-colors',
                'bg-[#FFC439] hover:bg-[#f0b72d] text-[#003087] border-[#FFC439]',
                (disabled || paymentInProgress) &&
                  'opacity-60 cursor-not-allowed',
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
                (disabled || paymentInProgress) &&
                  'opacity-60 cursor-not-allowed',
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

          {eligible.credit && (
            <button
              type="button"
              disabled={disabled || paymentInProgress}
              onClick={() => startPayment('credit')}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border font-semibold text-sm transition-colors',
                'bg-[#003087] hover:bg-[#002060] text-white border-[#003087]',
                (disabled || paymentInProgress) &&
                  'opacity-60 cursor-not-allowed',
              )}
            >
              {paymentInProgress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PayPalIcon className="h-5 w-5" />
              )}
              PayPal Credit
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
                (disabled || paymentInProgress) &&
                  'opacity-60 cursor-not-allowed',
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

          {/* Google Pay — rendered by Google's library, self-detects eligibility */}
          <GooglePayButton
            sdk={sdk}
            plan={selectedPlan}
            onPaymentComplete={handlePaymentComplete}
            onError={(msg) => setPaypalError(msg)}
            disabled={disabled || paymentInProgress}
          />

          {/* Apple Pay — Safari only, self-detects eligibility */}
          <ApplePayButton
            sdk={sdk}
            plan={selectedPlan}
            onPaymentComplete={handlePaymentComplete}
            onError={(msg) => setPaypalError(msg)}
            disabled={disabled || paymentInProgress}
          />
        </div>

        {/* ── Card Fields divider + form ────────────────────────────────── */}
        {eligible.advancedCards && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-muted/20 px-3 text-xs text-muted-foreground">
                  Or pay with card
                </span>
              </div>
            </div>

            <CardFieldsForm
              sdk={sdk}
              plan={selectedPlan}
              onPaymentComplete={handlePaymentComplete}
              onError={(msg) => setPaypalError(msg)}
              disabled={disabled || paymentInProgress}
            />
          </>
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

          {/* All payment methods */}
          {renderPaymentMethods()}

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
