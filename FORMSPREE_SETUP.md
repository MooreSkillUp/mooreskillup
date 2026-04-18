# Contact Form & Formspree Integration Guide

This guide walks you through setting up the contact form on MooreSkillUp with Formspree for email delivery.

## What is Formspree?

Formspree is a free service that captures form submissions and sends them to your email. No backend required!

**Features:**
- ✅ Free tier: 50 form submissions/month
- ✅ No server setup needed
- ✅ Works with static sites & SPAs
- ✅ Automatic email notifications
- ✅ Spam protection built-in
- ✅ GDPR compliant

---

## Setup Steps

### Step 1: Create a Formspree Account

1. Go to [formspree.io](https://formspree.io)
2. Click **"Get Started"**
3. Sign up with your email
4. Verify your email address

### Step 2: Create a New Form

1. In your Formspree dashboard, click **"Create Form"**
2. Choose **"Production"** (not sandbox)
3. Give it a name, e.g., **"Contact Form"**
4. Formspree will assign you a **Form ID** (something like `f/abcd1234efgh5678`)

### Step 3: Set Your Email Address

1. In the form settings, click **"Settings"**
2. Under "Your email" field, enter where you want to receive submissions
   - This can be your personal email or a company email
3. Click **"Save"**

### Step 4: Configure Environment Variables

1. Create a `.env.local` file in your project root (copy from `.env.example`)
2. Add your Formspree Form ID:

```env
# .env.local
VITE_FORMSPREE_FORM_ID=f/abcd1234efgh5678
VITE_WHATSAPP_NUMBER=1234567890
```

3. **Never commit `.env.local` to Git** — add it to `.gitignore`

### Step 5: Test the Form

1. Start your dev server: `bun run dev`
2. Navigate to `/contact`
3. Fill in the form and click **"Send Message"**
4. Check your email for the submission within seconds

---

## Advanced Setup Options

### Option 1: Send to Multiple Emails

In your Formspree form settings, you can add multiple recipients separated by commas:

```
email1@example.com, email2@example.com
```

### Option 2: Add CC/BCC

Use Formspree's email templates to CC/BCC users. See [Formspree docs](https://formspree.io/).

### Option 3: Slack Integration

Formspree integrates with Slack. Set it up in your form settings to get notifications in Slack.

### Option 4: Custom Thank You Page

After form submission, you can redirect users:

```typescript
// In contact.tsx, after successful submission:
window.location.href = '/thank-you';
```

Then create `src/routes/thank-you.tsx` with a custom message.

---

## WhatsApp Integration

The contact form includes a direct WhatsApp button for instant communication.

### Setup WhatsApp Button

1. Get your WhatsApp Business number (or personal if using WhatsApp Business)
2. Format without special characters: `1234567890`
3. Add to `.env.local`:

```env
VITE_WHATSAPP_NUMBER=1234567890
```

### How It Works

When users click the WhatsApp button:
1. Opens WhatsApp (web or app)
2. Pre-populates a message to your number
3. User can send a message immediately

---

## Troubleshooting

### Form Not Sending?

**Issue**: "Failed to send message"

**Solutions:**
- [ ] Check that Formspree form ID is correct in `.env.local`
- [ ] Verify you've verified your email in Formspree dashboard
- [ ] Check browser console for CORS errors
- [ ] Ensure form is in "Production" mode, not "Sandbox"

### Not Receiving Emails?

**Issue**: Form submits but no email received

**Solutions:**
- [ ] Verify recipient email in Formspree settings
- [ ] Check spam/junk folder
- [ ] Add Formspree's IP to your email whitelist (if using corporate email)
- [ ] Try resending from dashboard

### WhatsApp Link Not Working?

**Issue**: WhatsApp button doesn't open

**Solutions:**
- [ ] Check phone number format (no +, dashes, or spaces)
- [ ] Ensure user has WhatsApp installed
- [ ] Try on mobile (WhatsApp Desktop may have limitations)

---

## Example Email Template

Formspree automatically formats submitted data. The email looks like:

```
Name: John Doe
Email: john@example.com
Phone: +1 (555) 123-4567
Subject: General Inquiry
Message: I have a question about...

---
Submitted via MooreSkillUp Contact Form
Date: April 18, 2026, 10:30 AM
```

---

## Cost & Limits

| Tier | Price | Monthly Submissions |
|------|-------|-------------------|
| **Free** | $0 | 50 |
| **Lite** | $25/mo | 1,000 |
| **Professional** | $99/mo | Unlimited |

For a learning platform, Free tier is usually enough. Upgrade when you hit limits.

---

## Production Deployment

When deploying to production:

1. **Update Domain**
   - Go to Formspree settings
   - Add your production domain to "Allowed domains"
   - Example: `https://mooreskillup.com`

2. **Environment Variables**
   - Update `.env.production` with production Formspree ID
   - Update WhatsApp number if different

3. **Email Settings**
   - Verify production email address in Formspree
   - Test form submission before going live

---

## Security Best Practices

✅ **Do:**
- Use Formspree's built-in spam protection
- Keep form IDs out of version control (.gitignore)
- Verify sender email addresses in production
- Monitor spam submissions

❌ **Don't:**
- Expose Formspree form ID in client-side code exposed to public (it's okay, form ID is meant to be public)
- Store sensitive data in forms (PII, passwords, etc.)
- Use forms for file uploads without rate limiting

---

## Next Steps

1. ✅ Set up Formspree account
2. ✅ Get your Form ID
3. ✅ Add to `.env.local`
4. ✅ Test the contact form
5. ✅ Deploy to production
6. ✅ Monitor submissions

---

## Additional Resources

- [Formspree Documentation](https://formspree.io/docs)
- [WhatsApp API Documentation](https://www.whatsapp.com/business/api)
- [Contact Form Component Docs](#todo)

**Questions?** See the main SETUP_GUIDE.md or reach out to support.
