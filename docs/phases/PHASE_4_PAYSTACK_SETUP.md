# Phase 4 — Paystack Setup Guide

Real Paystack is built and tested. The system runs in **simulation mode** until
you add your secret key — so checkout works locally right now, and the moment
you set the key it switches to the real Paystack API automatically. No code
changes needed.

---

## How the payment flow works (so you understand it)

```
Student clicks "Pay"
  → backend creates a pending Payment + calls Paystack /transaction/initialize
  → student is redirected to Paystack's hosted checkout (authorization_url)
  → student pays with card / bank transfer / USSD
  → Paystack redirects back to  /payment/callback?reference=...
        → frontend calls /api/payments/verify/  → backend asks Paystack
          "is this reference really paid, for this exact amount?"  → unlocks course
  → AND, independently, Paystack POSTs a signed webhook to
        /api/payments/webhooks/paystack/  (the authoritative source of truth)
        → backend verifies the HMAC signature + amount → unlocks course
```

Two independent confirmations (callback + webhook), both **server-verified**.
The amount is always computed on the server and checked against what Paystack
reports — a tampered price is rejected. Fulfillment is idempotent, so a course
is never unlocked twice or double-charged.

---

## What you need to do (test mode)

### 1. Get your test keys
- Log in to the **Paystack Dashboard** → **Settings → API Keys & Webhooks**.
- Copy your **Test Secret Key** (`sk_test_...`) and **Test Public Key** (`pk_test_...`).

### 2. Add them to `backend/.env`
```env
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Optional (defaults to the live API host; leave as-is):
# PAYSTACK_BASE_URL=https://api.paystack.co
```
Then restart the backend (`docker compose up` reruns it; or restart `runserver`).

> The same secret key is used both to call the Paystack API **and** to verify
> webhook signatures — you do **not** need a separate webhook secret.

### 3. Register the webhook URL
In the Paystack Dashboard → **Settings → API Keys & Webhooks → Webhook URL**, set:
```
https://YOUR-BACKEND-DOMAIN/api/payments/webhooks/paystack/
```
- **Production:** your real backend domain (e.g. `https://api.mooreskillup.com/...`).
- **Local testing:** Paystack can't reach `localhost`. Use a tunnel:
  ```bash
  # install ngrok, then:
  ngrok http 8000
  # use the https URL it gives you:
  # https://abc123.ngrok-free.app/api/payments/webhooks/paystack/
  ```
  Put that ngrok URL in the Paystack webhook field while testing.

> Even without the webhook, the **callback verify** still unlocks the course when
> the student returns from Paystack. The webhook is the backup/authoritative path
> (e.g. if the student closes the tab before redirecting back).

### 4. Make sure the frontend knows its own URL
The callback URL is built from `NEXT_PUBLIC_APP_URL`. Set it in the frontend env:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000   # or your real domain in prod
```

### 5. Test a payment
- Log in as a student, open a **paid** course, click **Buy → Pay**.
- You're sent to Paystack's test checkout. Use a **Paystack test card**:
  - Card: `4084 0840 8408 4081` · CVV: `408` · Expiry: any future date · PIN: `0000` · OTP: `123456`
  - (Full list: Paystack Docs → "Test Cards".)
- After paying you land on `/payment/callback`, the course unlocks, and it appears
  in **My Courses**. The payment shows in **Admin → Payments**.

### 6. Going live (later)
- Swap the test keys for **Live** keys (`sk_live_...`, `pk_live_...`) in `backend/.env`.
- Update the webhook URL to your production backend domain.
- That's it — no code changes.

---

## Refunds (Super Admin)
- **Admin → Payments** shows every transaction with course + student + status.
- The **Refund** button (Super Admin only) calls Paystack's refund API, marks the
  payment refunded, and **revokes the student's access** to that course.

---

## Security notes (what makes this production-grade)
- ✅ Amount is computed server-side from the course price/discount — never trusted from the browser.
- ✅ Verify calls Paystack's `/transaction/verify` — the server confirms payment, it doesn't take the client's word.
- ✅ Webhook signature verified with HMAC-SHA512 using your secret key; bad signatures are rejected (401).
- ✅ Amount-mismatch guard: if the paid amount ≠ the charged amount, the course is **not** unlocked.
- ✅ Idempotent fulfillment: replays/duplicate webhooks never double-enroll.
- ✅ Webhook endpoint is exempt from maintenance mode so Paystack can always reach it.

## Tests
`backend/apps/payments/tests/test_paystack.py` covers initialize, discount
pricing, server-side verify, idempotency, webhook signature (valid + invalid),
amount tampering, and refunds (Super-Admin-only). All green.
