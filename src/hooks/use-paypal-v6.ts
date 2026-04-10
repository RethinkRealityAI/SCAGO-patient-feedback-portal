'use client';

import { useEffect, useRef, useState } from 'react';

// ── Public interfaces ────────────────────────────────────────────────────────

export interface PayPalV6Instance {
  findEligibleMethods: (opts?: {
    currencyCode?: string;
    countryCode?: string;
    amount?: string;
  }) => Promise<{ isEligible: (method: string) => boolean }>;

  // PayPal
  createPayPalOneTimePaymentSession: (opts: PayPalSessionOpts) => PayPalSession;
  // Pay Later
  createPayLaterOneTimePaymentSession: (opts: PayPalSessionOpts) => PayPalSession;
  // Venmo (US only)
  createVenmoOneTimePaymentSession: (opts: PayPalSessionOpts) => PayPalSession;
  // PayPal Credit
  createPayPalCreditOneTimePaymentSession: (opts: PayPalSessionOpts) => PayPalSession;
  // Google Pay
  createGooglePayOneTimePaymentSession: () => GooglePayPayPalSession;
  // Apple Pay
  createApplePayOneTimePaymentSession: () => Promise<ApplePayPayPalSession>;
  // Card Fields (credit / debit)
  createCardFieldsOneTimePaymentSession: () => CardFieldsSession;
}

// ── PayPal / Pay Later / Venmo / Credit sessions ────────────────────────────

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

// ── Google Pay session ──────────────────────────────────────────────────────

export interface GooglePayPayPalSession {
  getGooglePayConfig: () => Promise<{
    allowedPaymentMethods: unknown[];
    apiVersion: number;
    apiVersionMinor: number;
    [key: string]: unknown;
  }>;
  confirmOrder: (opts: {
    orderId: string;
    paymentMethodData: unknown;
  }) => Promise<{ status: string }>;
}

// ── Apple Pay session ───────────────────────────────────────────────────────

export interface ApplePayPayPalSession {
  config: () => Promise<{
    merchantCapabilities: string[];
    supportedNetworks: string[];
  }>;
  validateMerchant: (opts: {
    validationUrl: string;
    displayName: string;
  }) => Promise<unknown>;
  confirmOrder: (opts: {
    orderId: string;
    token: unknown;
    billingContact?: unknown;
  }) => Promise<{ status: string }>;
}

// ── Card Fields session ─────────────────────────────────────────────────────

export interface CardFieldsSession {
  createCardFieldsComponent: (opts: {
    type: 'number' | 'expiry' | 'cvv';
    placeholder?: string;
    style?: Record<string, unknown>;
  }) => HTMLElement;
  submit: (
    orderId: string,
    opts?: { billingAddress?: { postalCode?: string } },
  ) => Promise<{ data: { orderId: string }; state: string }>;
}

// ── Global type augmentation ─────────────────────────────────────────────────

declare global {
  interface Window {
    paypal?: {
      createInstance: (config: {
        clientId: string;
        components: string[];
        pageType: string;
      }) => Promise<PayPalV6Instance>;
    };
    google?: {
      payments: {
        api: {
          PaymentsClient: new (config: {
            environment: string;
            paymentDataCallbacks?: {
              onPaymentAuthorized?: (
                paymentData: unknown,
              ) => Promise<{
                transactionState: string;
                error?: { reason: string; message?: string; intent?: string };
              }>;
            };
          }) => GooglePaymentsClient;
        };
      };
    };
    ApplePaySession?: {
      new (
        version: number,
        request: unknown,
      ): {
        onvalidatemerchant: ((event: { validationURL: string }) => void) | null;
        onpaymentauthorized:
          | ((event: {
              payment: { token: unknown; billingContact?: unknown };
            }) => void)
          | null;
        oncancel: (() => void) | null;
        begin: () => void;
        completeMerchantValidation: (session: unknown) => void;
        completePayment: (status: number) => void;
        abort: () => void;
      };
      canMakePayments: () => boolean;
      STATUS_SUCCESS: number;
      STATUS_FAILURE: number;
    };
  }
}

export interface GooglePaymentsClient {
  isReadyToPay: (request: unknown) => Promise<{ result: boolean }>;
  createButton: (opts: {
    onClick: () => void;
    buttonColor?: string;
    buttonType?: string;
    buttonSizeMode?: string;
  }) => HTMLElement;
  loadPaymentData: (request: unknown) => Promise<unknown>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePayPalV6(clientId: string | undefined) {
  const [sdk, setSdk] = useState<PayPalV6Instance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initRef = useRef(false);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    if (initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    const scriptUrl =
      process.env.NEXT_PUBLIC_PAYPAL_MODE === 'live'
        ? 'https://www.paypal.com/web-sdk/v6/core'
        : 'https://www.sandbox.paypal.com/web-sdk/v6/core';

    const init = async () => {
      try {
        // Load the v6 script tag if window.paypal doesn't exist yet
        if (!window.paypal) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = scriptUrl;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () =>
              reject(new Error('Failed to load PayPal SDK script'));
            document.head.appendChild(script);
          });
        }

        if (cancelled) return;

        if (!window.paypal?.createInstance) {
          throw new Error(
            'PayPal SDK loaded but createInstance is not available',
          );
        }

        const instance = await window.paypal.createInstance({
          clientId,
          components: [
            'paypal-payments',
            'venmo-payments',
            'applepay-payments',
            'googlepay-payments',
            'card-fields',
          ],
          pageType: 'checkout',
        });

        if (cancelled) return;

        setSdk(instance);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Unknown PayPal error';
        console.error('[PayPal]', message);
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return { sdk, loading, error };
}
