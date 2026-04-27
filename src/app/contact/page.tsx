import { Metadata } from "next";
import { Button } from "@/components/Button";
import { MessageCircleMore, Mail, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us | MooreSkillUp",
  description: "Get in touch with our team.",
};

export default function ContactPage() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Get in touch
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
            Contact our team
          </h1>
          <p className="mt-4 mx-auto max-w-2xl text-muted-foreground">
            Have questions about our courses or need support? We are here to help you on your learning journey.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] max-w-5xl mx-auto">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MessageCircleMore className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold">WhatsApp</h3>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary">Chat with us directly</a>
                </div>
              </div>
            </div>
            
            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold">Email</h3>
                  <a href="mailto:support@mooreskillup.com" className="text-sm text-muted-foreground hover:text-primary">support@mooreskillup.com</a>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold">Office</h3>
                  <p className="text-sm text-muted-foreground">123 Learning Ave, Tech City</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
            <h2 className="font-display text-2xl font-bold mb-6">Send us a message</h2>
            <form className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="first-name" className="text-sm font-medium">First name</label>
                  <input type="text" id="first-name" className="w-full rounded-xl border border-input bg-background px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Jane" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="last-name" className="text-sm font-medium">Last name</label>
                  <input type="text" id="last-name" className="w-full rounded-xl border border-input bg-background px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email address</label>
                <input type="email" id="email" className="w-full rounded-xl border border-input bg-background px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="jane@example.com" />
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium">Message</label>
                <textarea id="message" rows={4} className="w-full rounded-xl border border-input bg-background px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="How can we help you?"></textarea>
              </div>
              <Button type="submit" className="w-full">
                Send message
              </Button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
