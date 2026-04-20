"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Phone, Send } from "lucide-react";
import { PublicShell } from "@/components/marketing/PublicShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { Textarea } from "@/components/ui/textarea";
import { publicEnv } from "@/lib/public-env";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const whatsappHref = `https://wa.me/${publicEnv.whatsappNumber}?text=Hello%20MooreSkillUp`;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`https://formspree.io/${publicEnv.formspreeFormId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        throw new Error("Failed to send");
      }
      setSubmitted(true);
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      console.error(error);
      window.alert("Unable to send right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(11,100,244,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(245,130,32,0.18),transparent_26%)] p-8 shadow-sm">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                Contact
              </div>
              <h1 className="mt-3 font-display text-5xl font-bold tracking-tight">
                Questions, upgrades, and WhatsApp-ready support
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Reach out for help choosing a track, understanding plan access,
                or asking about what comes next as the platform grows.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  {
                    icon: Mail,
                    title: "Email",
                    body: "support@mooreskillup.com",
                    href: "mailto:support@mooreskillup.com",
                  },
                  {
                    icon: Phone,
                    title: "WhatsApp",
                    body: "Fast replies for pre-sales and learner support",
                    href: whatsappHref,
                  },
                  {
                    icon: MessageSquare,
                    title: "Response time",
                    body: "Usually within 24 hours on business days",
                    href: "#contact-form",
                  },
                ].map((item) => (
                  <a
                    key={item.title}
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                    className="flex items-start gap-4 rounded-3xl border border-border bg-card/80 p-5 transition hover:border-primary/30"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-display text-xl font-bold">{item.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{item.body}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              id="contact-form"
              className="rounded-[2rem] border border-border bg-card p-6 shadow-sm"
            >
              <div className="font-display text-2xl font-bold">Send a message</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Use the form or jump to WhatsApp if you want a faster path.
              </p>

              {submitted && (
                <div className="mt-4 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm text-success">
                  Message sent successfully. We will get back to you shortly.
                </div>
              )}

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Full name"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    required
                  />
                </div>
                <Input
                  label="Phone"
                  value={formData.phone}
                  onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Message</label>
                  <Textarea
                    rows={6}
                    value={formData.message}
                    onChange={(event) => setFormData({ ...formData, message: event.target.value })}
                    placeholder="Tell us what you need help with..."
                    required
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" variant="accent" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Send message"} <Send className="h-4 w-4" />
                  </Button>
                  <a href={whatsappHref} target="_blank" rel="noreferrer">
                    <Button variant="outline">Open WhatsApp</Button>
                  </a>
                </div>
              </form>
            </motion.div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
