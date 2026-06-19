export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://mooreskillup.org",
  formspreeFormId:
    process.env.NEXT_PUBLIC_FORMSPREE_FORM_ID ?? "f/YOUR_FORM_ID",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "1234567890",
  brandLogoSrc: process.env.NEXT_PUBLIC_BRAND_LOGO ?? "/msu-logo.svg",
  mooretechUrl: process.env.NEXT_PUBLIC_MORETECH_URL ?? "https://moretech.example.com",
};

// Social links shown in the footer. Paste your real URLs here later (or set the
// matching NEXT_PUBLIC_* env vars). Until then they fall back to each network's
// homepage so the icons stay clickable.
export const socialLinks = {
  linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN ?? "https://linkedin.com",
  x: process.env.NEXT_PUBLIC_SOCIAL_X ?? "https://x.com",
  instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM ?? "https://instagram.com",
  facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK ?? "https://facebook.com",
  tiktok: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK ?? "https://tiktok.com",
  youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE ?? "https://youtube.com",
};
