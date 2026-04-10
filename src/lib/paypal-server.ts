/**
 * Shared PayPal server utilities for authentication, order creation, and capture.
 * Used by API routes and verification logic. Requires server-side execution only.
 */

export interface CaptureResult {
  captureId: string;
  status: string;
  amount: string;
  currency: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getPayPalMode(): string {
  return (
    process.env.NEXT_PUBLIC_PAYPAL_MODE ||
    process.env.PAYPAL_MODE ||
    process.env.PAYPAL_ENV ||
    'sandbox'
  ).toLowerCase();
}

function getPayPalApiBaseUrl(): string {
  return getPayPalMode() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

function getPayPalCredentials(): { clientId: string; clientSecret: string } {
  const clientId =
    process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId) {
    throw new Error(
      'PayPal client ID is missing. Set PAYPAL_CLIENT_ID or NEXT_PUBLIC_PAYPAL_CLIENT_ID.',
    );
  }

  if (!clientSecret) {
    throw new Error(
      'PayPal client secret is missing. Set PAYPAL_CLIENT_SECRET.',
    );
  }

  return { clientId, clientSecret };
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Obtain an OAuth2 access token from PayPal using client credentials.
 */
export async function getPayPalAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getPayPalCredentials();
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

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
    throw new Error('PayPal access token response did not include access_token.');
  }

  return json.access_token;
}

/**
 * Create a PayPal order with the given amount and return the order ID.
 */
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
          amount: {
            currency_code: input.currency,
            value: input.amount,
          },
          description: input.description,
        },
      ],
      application_context: {
        shipping_preference: 'NO_SHIPPING',
      },
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Failed to create PayPal order (${res.status}): ${body}`,
    );
  }

  const data = (await res.json()) as { id?: string };
  if (!data.id) {
    throw new Error('PayPal create-order response did not include an order ID.');
  }

  return data.id;
}

/**
 * Capture a previously approved PayPal order and return the capture details.
 */
export async function capturePayPalOrder(orderId: string): Promise<CaptureResult> {
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
    throw new Error(
      `Failed to capture PayPal order ${orderId} (${res.status}): ${body}`,
    );
  }

  const data = (await res.json()) as {
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{
          id?: string;
          status?: string;
          amount?: { value?: string; currency_code?: string };
        }>;
      };
    }>;
  };

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture || !capture.id) {
    throw new Error(
      `PayPal capture response for order ${orderId} did not contain capture details.`,
    );
  }

  return {
    captureId: capture.id,
    status: capture.status || 'UNKNOWN',
    amount: capture.amount?.value || '0.00',
    currency: capture.amount?.currency_code || 'USD',
  };
}

/**
 * Return the PayPal JS SDK v6 script URL appropriate for the current mode.
 */
export function getPayPalScriptUrl(): string {
  return getPayPalMode() === 'live'
    ? 'https://www.paypal.com/web-sdk/v6/core'
    : 'https://www.sandbox.paypal.com/web-sdk/v6/core';
}
