/**
 * Builds the site-wide link preview image.
 *
 * Every MooreSkillUp link shared to WhatsApp used to render as a grey box with
 * no picture, because the app had no og:image at all. This draws one from the
 * brand assets so the file in `public/` is always reproducible rather than a
 * mystery export someone made once in Canva.
 *
 *   node scripts/generate-og-image.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "public", "og-default.png");

const NAVY = "#012E68";
const NAVY_DEEP = "#01214B";
const ORANGE = "#FC6203";
const WIDTH = 1200;
const HEIGHT = 630;

const logo = readFileSync(join(root, "public", "msu-logo-white.svg"), "utf8");
// The wordmark is 827x159; place it at a width that leaves generous margins.
const LOGO_W = 620;
const LOGO_H = Math.round((159 / 827) * LOGO_W);

const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${NAVY}"/>
      <stop offset="100%" stop-color="${NAVY_DEEP}"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
  <rect x="0" y="${HEIGHT - 14}" width="${WIDTH}" height="14" fill="${ORANGE}"/>
  <circle cx="${WIDTH - 90}" cy="90" r="190" fill="${ORANGE}" opacity="0.10"/>
  <circle cx="60" cy="${HEIGHT - 70}" r="150" fill="${ORANGE}" opacity="0.07"/>
</svg>`);

const tagline = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="120">
  <text x="${WIDTH / 2}" y="60"
        text-anchor="middle"
        font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="42" font-weight="600" letter-spacing="1.5"
        fill="#FFFFFF">Skills Beyond the Classroom</text>
  <rect x="${WIDTH / 2 - 40}" y="86" width="80" height="5" rx="2.5" fill="${ORANGE}"/>
</svg>`);

const logoPng = await sharp(Buffer.from(logo)).resize(LOGO_W, LOGO_H).png().toBuffer();

const out = await sharp(background)
  .composite([
    { input: logoPng, top: Math.round(HEIGHT / 2) - LOGO_H - 30, left: Math.round((WIDTH - LOGO_W) / 2) },
    { input: tagline, top: Math.round(HEIGHT / 2) + 20, left: 0 },
  ])
  .png({ quality: 90 })
  .toBuffer();

writeFileSync(OUT, out);
console.log(`wrote ${OUT} (${WIDTH}x${HEIGHT}, ${(out.length / 1024).toFixed(0)}KB)`);
