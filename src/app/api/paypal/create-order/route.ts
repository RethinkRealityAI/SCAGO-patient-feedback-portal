import { NextRequest, NextResponse } from 'next/server';
import { MEMBERSHIP_PLAN_BY_ID } from '@/lib/membership-plans';
import { createPayPalOrder } from '@/lib/paypal-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId } = body;

    if (!planId || typeof planId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid planId.' },
        { status: 400 }
      );
    }

    const plan = MEMBERSHIP_PLAN_BY_ID[planId];
    if (!plan) {
      return NextResponse.json(
        { error: `Unknown plan: ${planId}` },
        { status: 400 }
      );
    }

    const orderId = await createPayPalOrder({
      amount: plan.amount.toFixed(2),
      currency: plan.currency,
      description: `SCAGO ${plan.category} ${plan.durationYears} year Membership`,
    });

    return NextResponse.json({ orderId });
  } catch (error) {
    console.error('[PayPal] Failed to create order:', error);
    return NextResponse.json(
      { error: 'Failed to create PayPal order.' },
      { status: 500 }
    );
  }
}
