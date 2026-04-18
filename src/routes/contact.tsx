import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  MessageSquare,
  Phone,
  MapPin,
  Send,
  CheckCircle,
} from "lucide-react";
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
import { AppShell } from "@/components/dashboard/AppShell";

export const Route = createFileRoute("/contact")({
  component: Contact,
});

function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "general",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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
      // Using Formspree - replace with your form ID
      const formId = import.meta.env.VITE_FORMSPREE_FORM_ID || "f/YOUR_FORM_ID";

      const response = await fetch(
        `https://formspree.io/${formId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        setIsSuccess(true);
        setFormData({
          name: "",
          email: "",
          phone: "",
          subject: "general",
          message: "",
        });

        // Reset success message after 5 seconds
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

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      value: "support@mooreskillup.com",
      href: "mailto:support@mooreskillup.com",
    },
    {
      icon: MessageSquare,
      title: "Live Chat",
      value: "Chat with us (9am-5pm EST)",
      href: "#chat",
    },
    {
      icon: Phone,
      title: "WhatsApp",
      value: "Quick support via WhatsApp",
      href: `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || "1234567890"}`,
    },
  ];

  return (
    <AppShell>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="border-b border-border bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-6xl"
          >
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Get in touch
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Have questions? Our team is here to help. Reach out to us and
              we'll respond as soon as possible.
            </p>
          </motion.div>
        </section>

        {/* Main Content */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-3">
              {/* Contact Info Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="space-y-6 lg:col-span-1"
              >
                {contactInfo.map((info, idx) => (
                  <a
                    key={idx}
                    href={info.href}
                    target={info.href.startsWith("http") ? "_blank" : undefined}
                    rel={info.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="group block rounded-xl border border-border bg-card p-6 transition-all hover:border-accent hover:bg-accent/5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                        <info.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-foreground">
                          {info.title}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                          {info.value}
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
                  className="flex items-center justify-center gap-2 rounded-lg bg-green-500 px-6 py-3 font-medium text-white transition-all hover:bg-green-600 active:scale-95"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-5.031 1.378c-3.055 2.364-3.905 6.75-1.896 10.217 1.572 2.589 4.544 3.949 7.601 3.949h.005c3.288 0 6.531-1.636 8.264-4.776.557-1.001 1.074-2.228 1.307-3.226.118-.524.212-1.045.212-1.578-.001-5.509-4.506-9.984-10.052-9.984" />
                  </svg>
                  Chat on WhatsApp
                </motion.a>
              </motion.div>

              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="lg:col-span-2"
              >
                <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
                  {isSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 flex items-center gap-3 rounded-lg bg-green-500/10 p-4 text-green-700"
                    >
                      <CheckCircle className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Message sent successfully!</p>
                        <p className="text-sm text-green-600">
                          We'll get back to you as soon as possible.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        Full Name
                      </label>
                      <Input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="John Doe"
                        className="mt-2"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        Email Address
                      </label>
                      <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="john@example.com"
                        className="mt-2"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        Phone Number (Optional)
                      </label>
                      <Input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+1 (555) 123-4567"
                        className="mt-2"
                      />
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        Subject
                      </label>
                      <Select value={formData.subject} onValueChange={handleSelectChange}>
                        <SelectTrigger className="mt-2">
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
                      <label className="block text-sm font-medium text-foreground">
                        Message
                      </label>
                      <Textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        placeholder="Tell us how we can help..."
                        rows={6}
                        className="mt-2"
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full"
                      variant="accent"
                    >
                      {isSubmitting ? (
                        <>Sending...</>
                      ) : (
                        <>
                          Send Message
                          <Send className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>

                  <p className="mt-4 text-xs text-muted-foreground">
                    We respect your privacy. Your message will only be used to
                    respond to your inquiry.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="border-t border-border bg-card px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mx-auto max-w-4xl"
          >
            <h2 className="font-display text-3xl font-bold text-foreground">
              Frequently Asked Questions
            </h2>

            <div className="mt-10 space-y-4">
              {[
                {
                  q: "What's the typical response time?",
                  a: "We aim to respond to all inquiries within 24 hours during business days.",
                },
                {
                  q: "Can I use WhatsApp for support?",
                  a: "Yes! Click the WhatsApp button to chat with us directly. We respond quickly to WhatsApp messages.",
                },
                {
                  q: "Do you offer technical support?",
                  a: "Yes, we provide technical support for all account and platform-related issues.",
                },
                {
                  q: "How do I become a partner?",
                  a: "Select 'Partnership' as your inquiry subject and tell us about your proposal.",
                },
              ].map((faq, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 + idx * 0.1 }}
                  className="rounded-lg border border-border p-5 hover:border-accent transition-colors"
                >
                  <h3 className="font-semibold text-foreground">{faq.q}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>
      </div>
    </AppShell>
  );
}
