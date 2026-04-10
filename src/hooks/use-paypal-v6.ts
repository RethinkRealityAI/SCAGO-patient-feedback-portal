'use client';

import { useEffect, useRef, useState } from 'react';

// ── Public interfaces ────────────────────────────────────────────────────────

export interface PayPalV6Instance {
  findEligibleMethods: (opts?: {
    currencyCode?: string;
    countryCode?: string;
    amount?: string;
  }) => Promise<{ isEligible: (method: string) => boolean }>;
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
  }
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
            script.onerror = () => reject(new Error('Failed to load PayPal SDK script'));
            document.head.appendChild(script);
          });
        }

        if (cancelled) return;

        if (!window.paypal?.createInstance) {
          throw new Error('PayPal SDK loaded but createInstance is not available');
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

        if (cancelled) return;

        setSdk(instance);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unknown PayPal error';
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
