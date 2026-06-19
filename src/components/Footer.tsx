import Link from "next/link";
import Image from "next/image";
import { publicEnv, socialLinks } from "@/lib/public-env";
import {
  FaLinkedin,
  FaXTwitter,
  FaInstagram,
  FaFacebook,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa6";

const socials = [
  { href: socialLinks.linkedin, icon: FaLinkedin, label: "LinkedIn" },
  { href: socialLinks.x, icon: FaXTwitter, label: "X" },
  { href: socialLinks.tiktok, icon: FaTiktok, label: "TikTok" },
  { href: socialLinks.instagram, icon: FaInstagram, label: "Instagram" },
  { href: socialLinks.facebook, icon: FaFacebook, label: "Facebook" },
  { href: socialLinks.youtube, icon: FaYoutube, label: "YouTube" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          {/* Brand Section */}
          <div className="max-w-md">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/msu-logo-potrait.svg"
                alt="Logo"
                width={160}
                height={45}
                className="block dark:hidden"
              />
              <Image
                src="/msu-logo-potrait-white.svg"
                alt="Logo"
                width={160}
                height={45}
                className="hidden dark:block"
              />
            </Link>

            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Premium learning experiences for builders, designers, and modern
              product teams.
            </p>

            <p className="mt-3 text-sm text-muted-foreground">
              Produced by{" "}
              <a
                href={publicEnv.mooretechUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary transition-colors hover:text-accent"
              >
                MooreTech
              </a>
            </p>


          </div>

            {/* Social Icons */}
            <div className="mt-6 flex items-center gap-4">
              {socials.map((social) => {
                const Icon = social.icon;

                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="rounded-full p-2 text-muted-foreground transition-all duration-200 hover:scale-110 hover:bg-muted hover:text-primary"
                  >
                    <Icon size={20} />
                  </a>
                );
              })}
            </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 border-t pt-6">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} MooreSkillUp. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}