export interface MembershipPlan {
  id: string;
  category: 'Individual' | 'Family';
  durationYears: number;
  amount: number;
  currency: 'CAD';
}

export const SCAGO_MEMBERSHIP_PLANS: MembershipPlan[] = [
  { id: 'individual-1yr', category: 'Individual', durationYears: 1, amount: 30.0, currency: 'CAD' },
  { id: 'individual-3yr', category: 'Individual', durationYears: 3, amount: 90.0, currency: 'CAD' },
  { id: 'individual-5yr', category: 'Individual', durationYears: 5, amount: 150.0, currency: 'CAD' },
  { id: 'individual-10yr', category: 'Individual', durationYears: 10, amount: 300.0, currency: 'CAD' },
  { id: 'family-1yr', category: 'Family', durationYears: 1, amount: 50.0, currency: 'CAD' },
  { id: 'family-3yr', category: 'Family', durationYears: 3, amount: 150.0, currency: 'CAD' },
  { id: 'family-5yr', category: 'Family', durationYears: 5, amount: 250.0, currency: 'CAD' },
  { id: 'family-10yr', category: 'Family', durationYears: 10, amount: 500.0, currency: 'CAD' },
];

export const MEMBERSHIP_PLAN_BY_ID: Record<string, MembershipPlan> = Object.fromEntries(
  SCAGO_MEMBERSHIP_PLANS.map((plan) => [plan.id, plan]),
);

export function formatMembershipPlanLabel(plan: MembershipPlan): string {
  return `${plan.category} - ${plan.durationYears} year Membership - $${plan.amount.toFixed(2)} ${plan.currency}`;
}
