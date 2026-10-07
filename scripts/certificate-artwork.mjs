/**
 * Build the certificate artwork.
 *
 *   node scripts/certificate-artwork.mjs
 *
 * Writes `public/certificate-artwork.svg` (the source) and
 * `public/certificate-artwork.png` (what jsPDF draws over, at print size).
 * Both are committed; run this after changing the logo or the geometry below.
 *
 * The artwork carries geometry, the real logo and the seal — never words.
 * Every line on a certificate is a jsPDF draw call in `src/lib/certificate.ts`,
 * so the text stays real text in the PDF and the signatory and institution
 * still come from the admin template rather than being baked into a picture.
 *
 * Authored at 2000 x 1414 (A4 landscape). The clear zones below are where the
 * platform places live data; nothing may be drawn into them.
 *
 *   centre band     y  392 - 840    name, course, track
 *   citation        y  860 - 940    the fixed citation lines
 *   signatures      y 1100 - 1215   x 228-637 and x 1363-1772
 *   certificate id  y 1290 - 1350   x 138-700
 *   qr code         y 1200 - 1340   x 1725-1862
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");

const W = 2000;
const H = 1414;

// Rendered larger than the authored size: about 257 DPI on A4 landscape, so a
// framed print holds up. jsPDF scales it to the page either way.
const RENDER_W = 3000;
const RENDER_H = 2121;

const NAVY = "#024293";
const ORANGE = "#FC6203";
const TEAL = "#0E8A7D";
const PAPER = "#FDFCFA";
const RULE = "#B6BECC";

/** Inline a logo's paths, scaled to `width` and centred on `cx`. */
function logo(name, width, cx, top) {
  const raw = readFileSync(path.join(PUBLIC, name), "utf8");
  const [, nativeWidth] = raw.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const inner = raw.slice(raw.indexOf(">", raw.indexOf("<svg")) + 1, raw.lastIndexOf("</svg>")).trim();
  const scale = width / Number(nativeWidth);
  return `<g transform="translate(${(cx - width / 2).toFixed(2)} ${top.toFixed(2)}) scale(${scale.toFixed(6)})">${inner}</g>`;
}

/**
 * A layered chevron cluster: one solid wedge and two parallel bands marching
 * out of the corner, in the house style.
 */
function shards(corner) {
  const solid = 230;
  const band = [262, 352];
  const hair = [384, 414];

  if (corner === "tl") {
    return (
      `<polygon points="0,0 ${solid},0 0,${solid}" fill="${NAVY}"/>` +
      `<polygon points="${band[0]},0 ${band[1]},0 0,${band[1]} 0,${band[0]}" fill="${ORANGE}"/>` +
      `<polygon points="${hair[0]},0 ${hair[1]},0 0,${hair[1]} 0,${hair[0]}" fill="${TEAL}"/>`
    );
  }
  return (
    `<polygon points="${W},0 ${W - solid},0 ${W},${solid}" fill="${ORANGE}"/>` +
    `<polygon points="${W - band[0]},0 ${W - band[1]},0 ${W},${band[1]} ${W},${band[0]}" fill="${NAVY}"/>` +
    `<polygon points="${W - hair[0]},0 ${W - hair[1]},0 ${W},${hair[1]} ${W},${hair[0]}" fill="${TEAL}"/>`
  );
}

/**
 * A notched seal: the stacked logo in white on navy, ringed and ticked. Sits
 * in the gap between the two signature blocks, where the drawn fallback puts
 * its own seal.
 */
function seal(cx, cy) {
  const ticks = [];
  for (let i = 0; i < 36; i += 1) {
    const angle = (i * 10 * Math.PI) / 180;
    const x1 = cx + 88 * Math.cos(angle);
    const y1 = cy + 88 * Math.sin(angle);
    const x2 = cx + 97 * Math.cos(angle);
    const y2 = cy + 97 * Math.sin(angle);
    ticks.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`);
  }
  return (
    `<g stroke="${NAVY}" stroke-width="3.2" stroke-linecap="round">${ticks.join("")}</g>` +
    `<circle cx="${cx}" cy="${cy}" r="86" fill="${NAVY}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="72" fill="none" stroke="${PAPER}" stroke-width="1.6" stroke-opacity="0.55"/>` +
    `<circle cx="${cx}" cy="${cy}" r="86" fill="none" stroke="${ORANGE}" stroke-width="5"/>` +
    logo("msu-logo-potrait-white.svg", 112, cx, cy - 28)
  );
}

function buildSvg() {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<rect width="${W}" height="${H}" fill="${PAPER}"/>`,
    shards("tl"),
    shards("tr"),
    logo("msu-logo.svg", 412, W / 2, 94),
    // The accent rule the drawn fallback puts under the title.
    `<rect x="${W / 2 - 80}" y="354" width="160" height="3.4" fill="${ORANGE}"/>`,
    // Signature rules. The platform skips its own when there is artwork, so
    // they have to come from here, at exactly the baseline it writes on.
    `<g stroke="${RULE}" stroke-width="1.5">` +
      `<line x1="228" y1="1158" x2="637" y2="1158"/>` +
      `<line x1="1363" y1="1158" x2="1772" y2="1158"/>` +
      `</g>`,
    seal(W / 2, 1098),
    // Footer bar: clears the lowest live data (the verify line, y 1343) and
    // grounds the page. jsPDF writes the domain and tagline over it.
    `<rect x="0" y="1360" width="${W}" height="${H - 1360}" fill="${NAVY}"/>`,
    `<rect x="0" y="1360" width="430" height="${H - 1360}" fill="${ORANGE}"/>`,
    `<rect x="430" y="1360" width="64" height="${H - 1360}" fill="${TEAL}"/>`,
    // Risers stepping up off the bar, angled to echo the shards at the top.
    // They stop short of the certificate id (x from 138) and the qr (x to 1862).
    `<polygon points="0,1178 104,1282 104,1360 0,1360" fill="${ORANGE}"/>`,
    `<polygon points="${W},1178 ${W - 104},1282 ${W - 104},1360 ${W},1360" fill="${TEAL}"/>`,
    "</svg>",
  ].join("");
}

const svg = buildSvg();
const svgPath = path.join(PUBLIC, "certificate-artwork.svg");
const pngPath = path.join(PUBLIC, "certificate-artwork.png");

writeFileSync(svgPath, svg, "utf8");

const png = await sharp(Buffer.from(svg), { density: 400 })
  .resize(RENDER_W, RENDER_H, { fit: "fill" })
  .png({ compressionLevel: 9, palette: true })
  .toBuffer();
writeFileSync(pngPath, png);

console.log(`certificate-artwork.svg  ${(svg.length / 1024).toFixed(0)} KB`);
console.log(`certificate-artwork.png  ${RENDER_W}x${RENDER_H}, ${(png.length / 1024).toFixed(0)} KB`);
