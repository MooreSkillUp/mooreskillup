import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Sparkles, BookOpen, BarChart3, ArrowRight, Check, X, Mail, MessageSquare, Phone, Send, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">MooreSkillUp</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 mr-auto ml-8">
          <a href="#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </a>
          <a href="#contact" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Contact
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">Login</Button>
          </Link>
          <Link to="/register">
            <Button variant="accent" size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Now enrolling for the Spring cohort
          </div>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Learn skills that <span className="text-accent">move you</span> forward.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            MooreSkillUp is a focused learning platform built around structured weekly
            modules, hands-on lessons, and clear progress — so you actually finish what
            you start.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register">
              <Button size="lg" variant="accent">
                Create free account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                I already have one
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-20 grid gap-5 sm:grid-cols-3"
        >
          {[
            {
              icon: BookOpen,
              title: "Structured courses",
              text: "Weekly modules with bite-sized lessons designed to fit your schedule.",
            },
            {
              icon: BarChart3,
              title: "Track progress",
              text: "Always know where you are, what's next, and what you've completed.",
            },
            {
              icon: Sparkles,
              title: "Stay motivated",
              text: "Announcements, live Q&As, and a focused dashboard to keep you on track.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section className="border-t border-border bg-gradient-to-b from-background to-card/20 px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-6xl"
        >
          <div className="mb-16 text-center">
            <h2 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start learning for free, upgrade when you're ready
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="rounded-2xl border border-border bg-card p-8 shadow-sm transition-all hover:border-accent/50 hover:shadow-md"
            >
              <div className="mb-8">
                <h3 className="font-display text-2xl font-bold text-foreground">Free</h3>
                <p className="mt-2 text-sm text-muted-foreground">Perfect for getting started</p>
              </div>

              <div className="mb-8">
                <span className="font-display text-5xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>

              <Button className="mb-8 w-full" variant="outline">
                Get started
              </Button>

              <div className="space-y-4">
                {[
                  { feature: "3 Free courses", included: true },
                  { feature: "Basic progress tracking", included: true },
                  { feature: "Community forum access", included: true },
                  { feature: "Certificates", included: false },
                  { feature: "Unlimited courses", included: false },
                  { feature: "Priority support", included: false },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {item.included ? (
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
                    )}
                    <span
                      className={item.included ? "text-foreground" : "text-muted-foreground"}
                    >
                      {item.feature}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative rounded-2xl border-2 border-accent bg-card p-8 shadow-lg"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
                <span className="bg-accent px-4 py-1 text-sm font-semibold text-accent-foreground rounded-full">
                  Most Popular
                </span>
              </div>

              <div className="mb-8">
                <h3 className="font-display text-2xl font-bold text-foreground">Professional</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Unlock your full potential
                </p>
              </div>

              <div className="mb-8">
                <span className="font-display text-5xl font-bold text-foreground">$29</span>
                <span className="text-muted-foreground">/month or $290/year (10% off)</span>
              </div>

              <Link to="/register">
                <Button className="mb-8 w-full" variant="accent">
                  Start free 7-day trial
                </Button>
              </Link>

              <div className="space-y-4">
                {[
                  { feature: "Unlimited access to all courses", included: true },
                  { feature: "Advanced progress tracking", included: true },
                  { feature: "Download certificates (PDF)", included: true },
                  { feature: "Priority email support", included: true },
                  { feature: "1-on-1 mentoring sessions", included: true },
                  { feature: "Exclusive community features", included: true },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-accent flex-shrink-0" />
                    <span className="text-foreground font-medium">{item.feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-lg bg-accent/10 p-4 text-sm text-accent">
                No credit card required for trial. Cancel anytime.
              </div>
            </motion.div>
          </div>

          {/* Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 rounded-xl border border-border overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-card/50">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">
                      Feature
                    </th>
                    <th className="px-6 py-4 text-center font-semibold text-foreground">
                      Free
                    </th>
                    <th className="px-6 py-4 text-center font-semibold text-foreground">
                      Professional
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { name: "Courses", free: "3", pro: "All" },
                    { name: "Lessons", free: "Limited", pro: "Unlimited" },
                    { name: "Quizzes", free: "Limited", pro: "Unlimited" },
                    { name: "Certificates", free: "—", pro: "✓" },
                    { name: "Progress Tracking", free: "Basic", pro: "Advanced" },
                    { name: "Community Access", free: "✓", pro: "✓ Premium" },
                    { name: "Email Support", free: "—", pro: "Priority" },
                    { name: "1-on-1 Mentoring", free: "—", pro: "✓" },
                    { name: "Ad-free Experience", free: "—", pro: "✓" },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-card/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-foreground">{row.name}</td>
                      <td className="px-6 py-3 text-center text-muted-foreground">
                        {row.free}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <Check className="h-5 w-5 text-accent mx-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Contact Section */}
      <ContactSection />

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} MooreSkillUp. Built for learners.
        <p className="mt-4 md:mt-0">
          Produced by{" "}
          <a href="https://mooretech-mt.vercel.app/" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors" style={{ textShadow: '0 0 10px oklch(0.66 0.20 255)' }}>
            MooreTech
          </a>
        </p>
      </footer>
    </div>
  );
}

// Contact Section Component
function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "general",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      subject: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formId = import.meta.env.VITE_FORMSPREE_FORM_ID || "f/YOUR_FORM_ID";
      const response = await fetch(`https://formspree.io/${formId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsSuccess(true);
        setFormData({
          name: "",
          email: "",
          phone: "",
          subject: "general",
          message: "",
        });

        setTimeout(() => {
          setIsSuccess(false);
        }, 5000);
      } else {
        alert("Failed to send message. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: Mail,
      title: "Email",
      value: "support@mooreskillup.com",
      href: "mailto:support@mooreskillup.com",
    },
    {
      icon: Phone,
      title: "WhatsApp",
      value: "Quick support via WhatsApp",
      href: `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || "1234567890"}?text=Hello%20MooreSkillUp`,
    },
  ];

  const faqItems = [
    {
      q: "What's the typical response time?",
      a: "We aim to respond to all inquiries within 24 hours during business days. WhatsApp messages are usually answered within a few minutes.",
    },
    {
      q: "Can I use WhatsApp for support?",
      a: "Yes! Click the WhatsApp button to chat with us directly. We respond quickly to WhatsApp messages during business hours.",
    },
    {
      q: "Do you offer technical support?",
      a: "Yes, we provide technical support for all account and platform-related issues. Free and Pro members both get support.",
    },
    {
      q: "Can I cancel my subscription?",
      a: "You can cancel your Pro subscription anytime. No commitments, no hidden fees. You'll keep access until your billing cycle ends.",
    },
    {
      q: "Is my data safe?",
      a: "Yes, we use industry-standard encryption and follow GDPR compliance. Your personal data is never shared with third parties.",
    },
    {
      q: "How do I get a refund?",
      a: "You can request a refund within 30 days of purchase. Just contact our support team with your request.",
    },
  ];

  return (
    <section id="contact" className="border-t border-border bg-gradient-to-b from-background to-card/10 px-6 py-16 lg:py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-6xl"
      >
        {/* Header */}
        <div className="mb-16 text-center">
          <h2 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Get in touch with us
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Have questions? We're here to help. Reach out via email, WhatsApp, or fill out the form below.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm"
          >
            <h3 className="mb-6 font-display text-2xl font-bold text-foreground">Send us a message</h3>

            {isSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 flex items-center gap-3 rounded-lg bg-green-500/10 p-4 text-green-700"
              >
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Message sent successfully!</p>
                  <p className="text-sm text-green-600">We'll get back to you as soon as possible.</p>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Full Name
                </label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                  className="w-full"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="john@example.com"
                  className="w-full"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Phone (Optional)
                </label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 123-4567"
                  className="w-full"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Subject
                </label>
                <Select value={formData.subject} onValueChange={handleSelectChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    <SelectItem value="support">Technical Support</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Message
                </label>
                <Textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder="Tell us how we can help..."
                  rows={5}
                  className="w-full"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
                variant="accent"
              >
                {isSubmitting ? "Sending..." : <>Send Message <Send className="h-4 w-4 ml-2" /></>}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                We respect your privacy. Your message will only be used to respond to your inquiry.
              </p>
            </form>
          </motion.div>

          {/* Contact Methods */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-5 flex flex-col justify-start"
          >
            <h3 className="font-display text-2xl font-bold text-foreground">Other ways to reach us</h3>

            {contactMethods.map((method, idx) => (
              <a
                key={idx}
                href={method.href}
                target={method.href.startsWith("http") ? "_blank" : undefined}
                rel={method.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="group block rounded-xl border border-border bg-card p-5 transition-all hover:border-accent hover:bg-accent/5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-accent/20 group-hover:text-accent transition-colors flex-shrink-0">
                    <method.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-display font-semibold text-foreground">
                      {method.title}
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {method.value}
                    </p>
                  </div>
                </div>
              </a>
            ))}

            {/* WhatsApp Button - Prominent */}
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || "1234567890"}?text=Hello%20MooreSkillUp`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-green-500 px-6 py-4 font-medium text-white transition-all hover:bg-green-600 active:scale-95 w-full"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-5.031 1.378c-3.055 2.364-3.905 6.75-1.896 10.217 1.572 2.589 4.544 3.949 7.601 3.949h.005c3.288 0 6.531-1.636 8.264-4.776.557-1.001 1.074-2.228 1.307-3.226.118-.524.212-1.045.212-1.578-.001-5.509-4.506-9.984-10.052-9.984" />
              </svg>
              Chat on WhatsApp
            </motion.a>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20"
        >
          <h3 className="mb-10 text-center font-display text-3xl font-bold text-foreground">
            Frequently Asked Questions
          </h3>

          <div className="mx-auto max-w-3xl space-y-3">
            {faqItems.map((faq, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 + idx * 0.05 }}
                className="rounded-lg border border-border hover:border-accent transition-colors"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between p-5 hover:bg-card/50 transition-colors"
                >
                  <h4 className="font-semibold text-foreground text-left">{faq.q}</h4>
                  <motion.div
                    animate={{ rotate: expandedFaq === idx ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                </button>
                <motion.div
                  animate={{ height: expandedFaq === idx ? "auto" : 0, opacity: expandedFaq === idx ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm text-muted-foreground">{faq.a}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
