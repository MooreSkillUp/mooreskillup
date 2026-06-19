"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, BadgeCheck, CreditCard, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { formatNaira } from "@/lib/commerce";
import { useFeedback } from "@/lib/feedback";
import { publicEnv } from "@/lib/public-env";
import { initializePayment, useCourse } from "@/lib/student";

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { notifyError, notifySuccess } = useFeedback();
  const { course, isLoading } = useCourse(courseId);
  const [processing, setProcessing] = useState(false);

  if (isLoading) {
    return (
      <AppShell allowedRoles={["student"]}>
        <div className="mx-auto max-w-2xl">
          <div className="h-80 animate-pulse rounded-[2rem] bg-muted/40" />
        </div>
      </AppShell>
    );
  }

  if (!course) {
    return (
      <AppShell allowedRoles={["student"]}>
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="font-display text-2xl font-bold">Course not found</h1>
          <Link href="/dashboard/courses" className="mt-4 inline-block font-semibold text-primary">
            Back to courses
          </Link>
        </div>
      </AppShell>
    );
  }

  const firstLessonHref = `/course/${course.id}`;
  const amount = course.discountPrice !== null && course.discountPrice < course.price ? course.discountPrice : course.price;

  if (course.isOwned) {
    return (
      <AppShell allowedRoles={["student"]}>
        <div className="mx-auto max-w-md py-16 text-center">
          <BadgeCheck className="mx-auto h-12 w-12 text-success" />
          <h1 className="mt-4 font-display text-2xl font-bold">You already own this course</h1>
          <Link href={firstLessonHref} className="mt-4 inline-block">
            <Button variant="accent">Go to course</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const pay = async () => {
    try {
      setProcessing(true);
      const appUrl = publicEnv.appUrl.replace(/\/$/, "");
      const callbackUrl = `${appUrl}/payment/callback`;
      // Start the transaction on the server, then hand off to Paystack's hosted
      // checkout. Paystack redirects back to /payment/callback?reference=...
      const init = await initializePayment(course.id, callbackUrl);
      window.location.href = init.authorization_url;
    } catch (e) {
      notifyError("Checkout failed", e instanceof Error ? e.message : "Please try again.");
      setProcessing(false);
    }
  };

  return (
    <AppShell allowedRoles={["student"]}>
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href={`/course/${course.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to course
        </Link>

        <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
          <div className="bg-gradient-to-r from-primary/10 via-background to-accent-soft p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Checkout</div>
            <h1 className="mt-2 font-display text-3xl font-bold">{course.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{course.subtitle}</p>
          </div>

          <div className="space-y-5 p-6">
            <div className="rounded-2xl border border-border bg-background p-5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Course price</span>
                <span className={course.discountPrice !== null ? "text-muted-foreground line-through" : "font-semibold"}>
                  {formatNaira(course.price)}
                </span>
              </div>
              {course.discountPrice !== null && course.discountPrice < course.price && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Discount price</span>
                  <span className="font-semibold">{formatNaira(course.discountPrice)}</span>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-lg font-bold">
                <span>Total</span>
                <span>{formatNaira(amount)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-5">
              <div className="flex items-center gap-3">
                <CreditCard className="h-6 w-6 text-primary" />
                <div>
                  <div className="font-semibold">Pay with Paystack</div>
                  <div className="text-sm text-muted-foreground">
                    Card, bank transfer, and mobile-ready checkout for Nigerian learners.
                  </div>
                </div>
              </div>
            </div>

            <Button variant="accent" size="lg" className="w-full" onClick={() => void pay()} loading={processing} loadingText="Processing...">
              <ShieldCheck className="h-4 w-4" /> Pay {formatNaira(amount)} securely
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              One-time payment unlocks full lifetime access to this course.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
