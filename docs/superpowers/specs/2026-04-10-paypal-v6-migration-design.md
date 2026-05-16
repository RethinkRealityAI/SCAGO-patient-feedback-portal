# PayPal JS SDK v6 Migration Design

**Date:** 2026-04-10
**Status:** Draft
**Scope:** Migrate membership payment from PayPal JS SDK v5 (`@paypal/react-paypal-js`) to v6 with all payment methods

---

## 1. Problem

- Current SDK (`@paypal/react-paypal-js` v8.9.2) wraps PayPal JS SDK v5
- Orders are created and captured client-side (less secure)
- Only PayPal button available; no Venmo, Google Pay, Apple Pay, or Pay Later
- Missing `PAYPAL_CLIENT_SECRET` on Netlify blocks server-side verification (root cause of submission failures)

## 2. Goals

- Migrate to PayPal JS SDK v6 loaded via script tag
- Move order creation and capture to server-side API routes
- Enable all eligible payment methods: PayPal, Pay Later, Venmo, Google Pay, Apple Pay
- Keep existing server-side verification in `submitFeedback()` as a second integrity check
- Maintain the same UX flow: pick plan -> pay -> form submits

## 3. Architecture

### 3.1 SDK Loading

A custom React hook `usePayPalV6` dynamically loads the v6 script and initializes the SDK instance.

- **Production:** `https://www.paypal.com/web-sdk/v6/core`
- **Sandbox:** `https://www.sandbox.paypal.com/web-sdk/v6/core`

The hook reads `NEXT_PUBLIC_PAYPAL_MODE` (defaulting to `sandbox`) to pick the URL, and `NEXT_PUBLIC_PAYPAL_CLIENT_ID` for initialization.

Returns: `{ sdk, loading, error }` where `sdk` is the initialized `PayPalSDKInstance`.

### 3.2 Server-Side API Routes

#### `POST /api/paypal/create-order`

**Request body:**
```json
{
  "planId": "individual-1yr",
  "amount": "25.00",
  "currency": "CAD",
  "description": "SCAGO Individual 1 year Membership"
}
```

**Server logic:**
1. Validate `planId` against `MEMBERSHIP_PLAN_BY_ID` to prevent amount tampering
2. Get PayPal access token using `PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET`
3. Call PayPal Orders API v2 `POST /v2/checkout/orders` with `intent: CAPTURE`
4. Return `{ orderId: "<paypal-order-id>" }`

#### `POST /api/paypal/capture-order`

**Request body:**
```json
{
  "orderId": "PAYPAL_ORDER_ID"
}
```

**Server logic:**
1. Call PayPal Orders API v2 `POST /v2/checkout/orders/{orderId}/capture`
2. Verify status is `COMPLETED`
3. Return `{ captureId, status, amount, currency }`

Both routes use a shared `lib/paypal-server.ts` utility for auth token management and API calls. The existing `paypal-verification.ts` stays unchanged.

### 3.3 Component Rewrite: `PayPalMembershipPayment`

**Flow:**
1. User selects a membership plan (same plan picker UI)
2. Hook loads v6 SDK, calls `findEligibleMethods({ currencyCode: "CAD" })`
3. For each eligible method, create a payment session:
   - `createPayPalOneTimePaymentSession()` for PayPal
   - `createPayLaterOneTimePaymentSession()` for Pay Later
   - `createVenmoOneTimePaymentSession()` for Venmo
   - Google Pay and Apple Pay via their respective session creators
4. Render web components: `<paypal-button>`, `<paypal-pay-later-button>`, plus custom buttons for wallets
5. On click, session calls `/api/paypal/create-order` then starts the PayPal flow
6. On approve, calls `/api/paypal/capture-order` then emits `onChange(paymentData)` to the form

**All sessions share the same `onApprove` handler** since the capture flow is identical regardless of payment method.

### 3.4 Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Client + Server | SDK initialization + server auth |
| `PAYPAL_CLIENT_SECRET` | Server only | Server auth for Orders API |
| `NEXT_PUBLIC_PAYPAL_MODE` | Client + Server | `live` or `sandbox` (determines script URL + API base) |

`PAYPAL_MODE` (already set on Netlify) is kept as a server-only fallback. The code checks `NEXT_PUBLIC_PAYPAL_MODE || PAYPAL_MODE` so both work.

### 3.5 Existing Verification (Unchanged)

`submitFeedback()` in `actions.tsx` continues to call `verifyPayPalPaymentsForSubmission()` which independently verifies the capture via PayPal's API. This is a defense-in-depth check that runs regardless of how the payment was made.

## 4. File Changes

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/use-paypal-v6.ts` | Create | Script loader + SDK init hook |
| `src/lib/paypal-server.ts` | Create | Shared PayPal server utilities (auth, API calls) |
| `src/app/api/paypal/create-order/route.ts` | Create | Server-side order creation |
| `src/app/api/paypal/capture-order/route.ts` | Create | Server-side capture |
| `src/components/paypal-membership-payment.tsx` | Rewrite | v6 SDK integration with all payment methods |
| `src/lib/paypal-verification.ts` | Update | Use shared `paypal-server.ts` for auth (DRY) |
| `package.json` | Update | Remove `@paypal/react-paypal-js` |

## 5. Payment Methods

| Method | Component/Button | Notes |
|--------|-----------------|-------|
| PayPal | `<paypal-button>` web component | Primary. Always shown. |
| Pay Later | `<paypal-pay-later-button>` web component | Shown if eligible for buyer's region |
| Venmo | Custom button + `createVenmoOneTimePaymentSession` | US buyers only. Eligibility-gated. |
| Google Pay | `createGooglePayPaymentSession` | Requires PayPal dashboard enablement |
| Apple Pay | `createApplePayPaymentSession` | Requires PayPal dashboard enablement + domain verification |

Each method is only rendered if `findEligibleMethods()` reports it as eligible.

## 6. PayPal Dashboard Configuration Required

To enable all payment methods, the user must configure the following in the PayPal Developer Dashboard:

### Venmo
1. Go to **Dashboard > Apps & Credentials** (Live mode)
2. Select your app
3. Under **Features**, enable **Venmo**
4. No additional domain config needed

### Google Pay
1. In the same app settings, under **Features**, enable **Google Pay**
2. No additional domain config needed (PayPal handles Google registration)

### Apple Pay
1. Under **Features**, enable **Apple Pay**
2. **Domain verification required:** Download the domain association file from PayPal
3. Host it at `https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association`
4. Register your domain in the PayPal dashboard

### Pay Later
1. Usually enabled by default for eligible merchants
2. Verify under **Features** that **Pay Later Messaging** is active
3. Availability depends on buyer country and purchase amount

## 7. Error Handling

- SDK load failure: Show fallback message with retry button
- Payment method ineligible: Simply not rendered (no error)
- Order creation failure: Toast error, allow retry
- Capture failure: Toast error, allow retry
- All errors logged to console with `[PayPal]` prefix

## 8. Security

- Server-side order creation prevents amount tampering (plan amount validated against `MEMBERSHIP_PLAN_BY_ID`)
- Server-side capture ensures payment is actually collected before form submission
- Double verification: capture on our server + `verifyPayPalCapture()` on form submit
- `PAYPAL_CLIENT_SECRET` never exposed to client
