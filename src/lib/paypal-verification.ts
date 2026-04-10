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

async function getCaptureDetails(captureId: string, accessToken: string): Promise<PayPalCaptureDetails> {
  const captureRes = await fetch(`${getPayPalApiBaseUrl()}/v2/payments/captures/${captureId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!captureRes.ok) {
    const body = await captureRes.text();
    throw new Error(`Unable to fetch PayPal capture ${captureId} (${captureRes.status}): ${body}`);
  }

  return (await captureRes.json()) as PayPalCaptureDetails;
}

export async function verifyPayPalCapture(input: {
  captureId: string;
  expectedAmount?: number;
  expectedCurrency?: string;
}): Promise<{ ok: true; capture: PayPalCaptureDetails } | { ok: false; error: string }> {
  try {
    const accessToken = await getPayPalAccessToken();
    const capture = await getCaptureDetails(input.captureId, accessToken);

    if (capture.status !== 'COMPLETED') {
      return {
        ok: false,
        error: `PayPal capture ${input.captureId} is not completed (status: ${capture.status || 'unknown'}).`,
      };
    }

    const captureAmount = capture.amount || capture.seller_receivable_breakdown?.gross_amount;
    const currency = (captureAmount?.currency_code || '').toUpperCase();
    const value = parseAmount(captureAmount?.value);

    if (input.expectedCurrency && currency !== input.expectedCurrency.toUpperCase()) {
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
      error: error instanceof Error ? error.message : 'Unknown PayPal verification error.',
    };
  }
}
