import { NextRequest, NextResponse } from 'next/server';
import { createPayPalOrder } from '@/lib/paypal-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, currency, description } = body;

    if (!amount || !currency) {
      return NextResponse.json({ error: 'Missing amount or currency.' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 });
    }

    const orderId = await createPayPalOrder({
      amount: numAmount.toFixed(2),
      currency: currency.toUpperCase(),
      description: description || 'SCAGO Payment',
    });

    return NextResponse.json({ orderId });
  } catch (error) {
    console.error('[PayPal] Create generic order error:', error);
    return NextResponse.json({ error: 'Failed to create PayPal order.' }, { status: 500 });
  }
}
