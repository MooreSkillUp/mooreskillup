# Going live

The order to do things in, from an empty deployed platform to real students.

Today: `main` deploys automatically — the API to Azure Container Apps, the frontend to
Vercel. Both are up. The database is empty: **no courses, no admin, nobody using it.**
That's why the first phase below can run on the live site instead of a separate staging
one.

| | |
|---|---|
| Frontend | https://mooreskillup.vercel.app |
| API | `https://mooreskillup-prod-api.…azurecontainerapps.io` (GitHub variable `NEXT_PUBLIC_API_URL`) |
| Deploy | merge to `main`, or Actions → Deploy → Run workflow |

---

## 1. Set the four environment variables

Repository → Settings → Secrets and variables → Actions.

**Secrets** (hidden after saving):

| Name | Where it comes from |
|---|---|
| `BREVO_API_KEY` | Brevo → SMTP & API → API keys → Create a new API key (v3) |
| `PAYSTACK_SECRET_KEY` | Paystack → Settings → API Keys & Webhooks → **Secret key** |

**Variables** (visible):

| Name | Value |
|---|---|
| `DEFAULT_FROM_EMAIL` | `MooreSkillUp <no-reply@yourdomain>` — the address **must be verified in Brevo**, or mail silently goes nowhere |
| `PAYSTACK_PUBLIC_KEY` | Paystack → the matching **Public key** |

**Use Paystack's TEST keys for now** (`sk_test_…` / `pk_test_…`). Swap to live keys in step 5,
when you're ready to take real money. Live keys need Paystack business verification, so
start that paperwork early if it isn't done.

### Getting the two email values out of Brevo

**The API key** (not SMTP credentials — the API talks to Brevo over HTTP):

1. Brevo → click your name, top right → **SMTP & API**
2. **API keys** tab → **Generate a new API key**
3. Name it something you'll recognise later, e.g. `mooreskillup-production`
4. Copy it — it starts `xkeysib-` and is shown **once**
5. GitHub → Settings → Secrets and variables → Actions → **New repository secret** → `BREVO_API_KEY`

**The From address.** Brevo refuses to send from an address you haven't proved you own.

*Now, before you have a domain:* Brevo → **Senders, Domains & Dedicated IPs** → **Senders** →
**Add a sender** → your name and the address you already use (e.g. `mooreskillup@gmail.com`).
Brevo emails that address a confirmation link; click it, and the sender is verified. Then set
the variable:

```
DEFAULT_FROM_EMAIL = MooreSkillUp <mooreskillup@gmail.com>
```

That format — name, then the address in angle brackets — is what students see in their inbox.

> **Expect some messages to land in spam while you send from a `@gmail.com` address.**
> Gmail publishes rules saying only Google may send as `@gmail.com`; Brevo isn't Google, so
> receiving servers treat it with suspicion. Fine for testing with your own team. Not fine
> for real students.

*Later, when the domain arrives:* Brevo → **Domains** → add it → Brevo gives you DNS records
(DKIM, SPF, and a DMARC record) to paste at your registrar → verify. Then change
`DEFAULT_FROM_EMAIL` to something like `MooreSkillUp <no-reply@yourdomain.com>` and redeploy.
**That's a settings change, not a code change** — nothing else needs touching.

### Check it actually arrives

Settings are believable only after a message lands. Once deployed:

```bash
az containerapp exec \
  --name mooreskillup-prod-api --resource-group rg-mooreskillup-prod \
  --command "python manage.py send_test_email --to you@yourdomain"
```

It prints which backend and which From address it used, then sends one real message. Go and
look — **check the spam folder too**, and note which one it landed in. If the backend still
says `console`, the key didn't reach the container: check the secret name and redeploy.

Then: **Actions → Deploy → Run workflow.** The variables are applied to the running
container by that deploy, not before.

### Tell Paystack where to call back

Paystack → Settings → API Keys & Webhooks → Webhook URL (set it on **Test** now, and again
on **Live** later):

```
https://<your api host>/api/payments/webhooks/paystack/
```

This is how a payment still completes when a student closes the tab before being
redirected back. Without it, some payments stay "pending" until they return.

---

## 2. Create the first Super Admin

There's no admin yet, and the public admin sign-up page can't work in production (it needs
`ADMIN_REGISTRATION_TOKEN`, which the deploy doesn't pass). Use the bootstrap command.

Find the container app, then run it:

```bash
az login
az containerapp list -o table          # note the NAME and RESOURCE GROUP

az containerapp exec \
  --name <name> --resource-group <resource-group> \
  --command "python manage.py create_admin --email you@yourdomain --name 'Your Name'"
```

It prints a password **once**. Sign in with it; you'll be asked to change it.

Running it again is safe: an existing account is promoted to Super Admin and its password
is left alone.

---

## 3. Put the platform's content in place

In this order, because each step depends on the one before:

1. **Categories and tracks** — Admin → Courses (categories). *Nobody can register until at
   least one exists: the sign-up form asks new students to choose a path.*
2. **Teachers** — Admin → Teachers → Add teacher. Each gets an email with sign-in details;
   if email isn't working yet, the screen gives you the password to pass on.
3. **Courses** — teachers build and submit; you approve in Admin → Course reviews.
4. **Settings** — Admin → Settings: platform name, refund window, support reply target,
   and whether to require two-factor for admins (recommended before real money).

---

## 4. Test it

Use [the test script](TESTING.md) — or the shared version, which collects reports in one
place. Give each tester one role.

**While testing:** registration is open to anyone with the link, so don't post the URL
publicly. If you want it shut between sessions: Admin → Settings → *Student registration
open* → off.

Fix what comes back before step 5.

---

## 5. Switch to real money

1. Replace `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` with the **live** pair.
2. Set the Paystack webhook again on **Live** mode.
3. **Actions → Deploy → Run workflow.**
4. Check Admin → Payments: it should no longer say "No real money has been taken yet" once
   a genuine payment lands. Test payments made during step 4 stay visible but are marked as
   test, and never count toward revenue.
5. Remove the accounts and courses you created purely for testing.

---

## 6. After it's live

- **Don't test on production once real students are on it.** At that point a staging
  environment earns its cost: the same Terraform with a second environment name and its own
  database and Paystack test keys.
- **Activity log retention** is applied when an admin first opens Activity logs each day.
  If you'd rather it ran on a schedule, `python manage.py prune_audit_logs` is the command
  to give a nightly job.
- **Scheduled broadcasts** go out when someone loads the app after their due time.
  `python manage.py send_due_broadcasts` does the same on a schedule if you want them
  punctual.

---

## If something looks wrong on the live site

- **Everything fails for students but works for you** → maintenance mode is on
  (Admin → Settings).
- **Nobody can sign up** → *Student registration open* is off, or there are no categories.
- **Checkout refuses** → no Paystack key reached the server, or purchases are paused in
  Settings. The admin dashboard says which.
- **Emails aren't arriving** → the dashboard tells you when mail isn't being delivered.
  Check the Brevo key and that `DEFAULT_FROM_EMAIL` is a verified sender.
