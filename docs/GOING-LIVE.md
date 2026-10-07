# Going live

The order to do things in, from an empty deployed platform to real students.

Today: `main` deploys automatically — the API to Azure Container Apps, the frontend to
Vercel. Both are up. The database is empty: **no courses, no admin, nobody using it.**
That's why the first phase below can run on the live site instead of a separate staging
one.

| | |
|---|---|
| Frontend | https://app.mooreskillup.com (Vercel) |
| API | https://api.mooreskillup.com (GitHub variable `NEXT_PUBLIC_API_URL`) |
| Deploy | merge to `main`, or Actions → Deploy → Run workflow |

Steps 1 to 4 have been done once already: the admin exists, Tech Foundations is
published, and the demo accounts are seeded. `python manage.py seed_demo --wipe`
removes the demo data when you want the site clean for real students.

---

## 1. Set the environment variables

Repository → Settings → Secrets and variables → Actions.

**Secrets** (hidden after saving):

| Name | Where it comes from |
|---|---|
| `BREVO_API_KEY` | Brevo → SMTP & API → API keys → Create a new API key (v3) |
| `PAYSTACK_SECRET_KEY` | Paystack → Settings → API Keys & Webhooks → **Secret key** |
| `MUX_SIGNING_KEY_ID` | Mux → Settings → Signing Keys → the key's ID |
| `MUX_SIGNING_KEY_PRIVATE` | The private key from the same place. Shown **once**, so save it then. Paste the base64 blob Mux gives you, or the `-----BEGIN…` PEM — either is accepted |
| `ADMIN_REGISTRATION_TOKEN` | Optional. A long random string you invent. See step 2 |

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

### Mux: video nobody can re-share

What the two Mux values do, and what they do not:

- **They do** turn on signed playback. The lesson page asks the API for a token
  minted for that one viewer, good for four hours, and only after the same
  entitlement check that decides whether the lesson is visible at all. A link
  copied into a group chat is dead before anybody clicks it.
- **They do not** give anyone an upload button. Video gets into Mux through the
  Mux dashboard; what comes back into the lesson is a playback ID.

In the Mux dashboard:

1. **Settings → Signing Keys → Generate new key.** Copy the key ID and the
   private key into the two secrets above. The private key is shown once.
2. Upload each asset with its **playback policy set to `signed`**, not `public`.
   A public playback ID plays without a token, which is the thing we are
   avoiding. An asset that is already public gets a signed playback ID added to
   it rather than being converted.
3. Worth doing: a **playback restriction** limiting the referrer to
   `app.mooreskillup.com`, so a token that does leak still only plays on our
   own site.

If the keys are missing the backend hands back the unsigned stream URL, so a
**signed** playback ID quietly fails to play. That is the symptom to look for:
the lesson page loads, the player does not start.

### Getting a video into a lesson

1. Upload it in Mux with playback policy `signed`.
2. Copy the **playback ID** from the asset.
3. In the course editor open the lesson, set its type to Video, and paste into
   **Mux playback ID**. The bare ID, a `stream.mux.com/<id>.m3u8` link and the
   player URL all work.
4. Leave **Video URL** empty. When both are set the Mux ID wins, but an
   unused URL left behind only confuses whoever edits the lesson next.

Teachers do not upload to Mux themselves. They send us the file, we upload it
and paste the playback ID back. Per-teacher direct upload is a decision for
after launch.

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

There's no admin yet. Two ways in — pick one.

### Either: the command (nothing to leave lying around)

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

### Or: the admin sign-up page, with a token

Set the `ADMIN_REGISTRATION_TOKEN` secret to a long random string, deploy, then go to
`/auth/admin-register` and register with that token in the form.

**What that token is:** a password for *becoming an admin*. Anyone who has it — anyone it
gets forwarded to, anyone who sees it on a screen — can create an admin account on your
platform, with no approval from you. It has no expiry and no audit trail of its own.

So if you use it:

- make it long and random (`openssl rand -base64 32`), never a phrase you'd recognise;
- use it once, for yourself;
- **then clear the secret and redeploy** — an empty value closes the page again;
- add everyone else from Admin → Admin team, where every change is recorded against a name.

Left empty (the default), that page refuses every attempt, which is the safe state.

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
- **Scheduled broadcasts** are punctual: a Container Apps job runs
  `send_due_broadcasts` every five minutes
  (`infrastructure/terraform/modules/container_apps/scheduled_jobs.tf`). They also
  go out when someone loads the app after their due time, so the job failing
  delays them rather than losing them.

---

## If something looks wrong on the live site

- **Everything fails for students but works for you** → maintenance mode is on
  (Admin → Settings).
- **Nobody can sign up** → *Student registration open* is off, or there are no categories.
- **Checkout refuses** → no Paystack key reached the server, or purchases are paused in
  Settings. The admin dashboard says which.
- **Emails aren't arriving** → the dashboard tells you when mail isn't being delivered.
  Check the Brevo key and that `DEFAULT_FROM_EMAIL` is a verified sender.
