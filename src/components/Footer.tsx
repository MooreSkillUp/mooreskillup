import Link from "next/link";
import { publicEnv } from "@/lib/public-env";

const links = [
  { href: "/courses", label: "Courses" },
  { href: "/pricing", label: "Pricing" },
  { href: "/quiz-shop", label: "Quiz Shop" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/40 mt-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <div className="font-display text-lg font-bold">MooreSkillUp</div>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Premium learning experiences for builders, designers, and modern product teams.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Produced by{" "}
            <a
              href={publicEnv.moretechUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary hover:text-accent"
            >
              MooreTech
            </a>
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
