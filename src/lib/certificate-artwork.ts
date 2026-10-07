/**
 * The certificate artwork.
 *
 * `public/certificate-artwork.png` is rendered from `certificate-artwork.svg`
 * in the same folder — that SVG is the source, and re-rendering it is one
 * `sharp` call. The artwork holds geometry, the logo and the seal; every word
 * on the certificate is drawn by jsPDF over the top, so the text stays real
 * text in the PDF and the signatory still comes from the admin template.
 *
 * Fetched once per page load and kept as a data URL, because jsPDF needs the
 * bytes rather than a URL. A failure is not cached: a certificate someone has
 * earned falls back to the drawn frame and can try again on the next download.
 */

const ARTWORK_URL = "/certificate-artwork.png";

let pending: Promise<string | undefined> | null = null;

export function certificateArtwork(): Promise<string | undefined> {
  if (pending) return pending;

  pending = (async () => {
    try {
      const response = await fetch(ARTWORK_URL);
      if (!response.ok) return undefined;
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch {
      return undefined;
    }
  })();

  // Forget a failure, so a student who was offline for a moment is not stuck
  // with the plain frame for the rest of the session.
  void pending.then((artwork) => {
    if (!artwork) pending = null;
  });

  return pending;
}
