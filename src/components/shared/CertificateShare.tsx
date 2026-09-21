"use client";

import { useState } from "react";
// lucide dropped its brand icons, so the LinkedIn button wears a credential
// badge. The label says where it goes.
import { BadgeCheck, Check, Copy, MessageCircle, Share2 } from "lucide-react";

import { Button } from "@/components/ui-kit/Button";
import {
  linkedInAddUrl,
  shareCertificate,
  whatsAppShareUrl,
  type ShareableCertificate,
} from "@/lib/certificate-sharing";
import { useFeedback } from "@/lib/feedback";

/**
 * The buttons that turn a certificate into something other people see.
 *
 * LinkedIn is first and is the accent button, because that is where a
 * credential does its job. WhatsApp is next, because that is where Nigerians
 * actually share things. The generic share sheet is there for everywhere else,
 * and copying the link is the fallback that always works.
 */
export function CertificateShare({
  certificate,
  institution,
}: {
  certificate: ShareableCertificate;
  institution?: string;
}) {
  const { notifySuccess } = useFeedback();
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(certificate.verificationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notifySuccess("Your verification link", certificate.verificationUrl);
    }
  };

  const share = async () => {
    const result = await shareCertificate(certificate);
    if (result === "copied") {
      notifySuccess("Copied", "Paste it anywhere you like.");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={linkedInAddUrl(certificate, institution)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Add this certificate to your LinkedIn profile"
      >
        <Button variant="accent" size="sm">
          <BadgeCheck className="h-4 w-4" />
          Add to LinkedIn
        </Button>
      </a>

      <a
        href={whatsAppShareUrl(certificate)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share this certificate on WhatsApp"
      >
        <Button variant="outline" size="sm">
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Button>
      </a>

      <Button variant="outline" size="sm" onClick={() => void share()}>
        <Share2 className="h-4 w-4" />
        Share
      </Button>

      <Button variant="outline" size="sm" onClick={() => void copyLink()}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
