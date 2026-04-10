import { NextRequest, NextResponse } from 'next/server';
import { capturePayPalOrder } from '@/lib/paypal-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json(
        { error: 'Missing orderId.' },
        { status: 400 }
      );
    }

    const result = await capturePayPalOrder(orderId);

    if (result.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: `Capture not completed (status: ${result.status}).` },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[PayPal] Failed to capture order:', error);
    return NextResponse.json(
      { error: 'Failed to capture PayPal order.' },
      { status: 500 }
    );
  }
}
