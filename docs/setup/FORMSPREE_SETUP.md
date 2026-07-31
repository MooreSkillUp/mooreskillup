# Formspree Setup

The contact page is implemented in:

- `src/app/contact/page.tsx`

## Environment variables

Set these in `.env.local`:

```env
NEXT_PUBLIC_FORMSPREE_FORM_ID=f/YOUR_FORMSPREE_FORM_ID
NEXT_PUBLIC_WHATSAPP_NUMBER=1234567890
```

## What the contact page does

- posts form data to `https://formspree.io/<form-id>`
- shows a success state after submission
- renders WhatsApp quick links using `NEXT_PUBLIC_WHATSAPP_NUMBER`

## Test checklist

1. Open `/contact`
2. Submit a test message
3. Confirm you receive it in Formspree
4. Confirm the success message appears
5. Confirm the WhatsApp button opens the expected number

## Notes

- This contact flow is independent of the future Django backend.
- If you later want Django to own support requests, replace the Formspree call with a POST to your Django API.
