"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, CreditCard, LoaderCircle, Smartphone } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import {
  formatNaira,
  getPaymentMethodDescription,
  getPaymentMethodLabel,
  type PaymentMethod,
} from "@/lib/commerce";
import { useTeacherWorkspace } from "@/lib/teacher-workspace";

type CheckoutPhase = "select" | "processing" | "success";

const paymentMethods: PaymentMethod[] = ["paystack", "opay"];

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { getCourseById, isCourseOwnedByStudent, purchaseCourse, getContinueLearningLessonId } =
    useTeacherWorkspace();
  const course = getCourseById(params.id as string);
  const owned = course ? isCourseOwnedByStudent(course.id) : false;
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("paystack");
  const [phase, setPhase] = useState<CheckoutPhase>(owned ? "success" : "select");
  const [error, setError] = useState("");

  const paymentResult = useMemo(() => {
    if (!course) return null;
    return {
      amount: formatNaira(course.price),
      title: course.title,
      description: course.subtitle,
    };
  }, [course]);

  useEffect(() => {
    if (owned) {
      setPhase("success");
    }
  }, [owned]);

  useEffect(() => {
    if (phase !== "processing" || !course) return;

    const timer = window.setTimeout(() => {
      const result = purchaseCourse(course.id, selectedMethod);
      if (!result.ok) {
        setError(result.message);
        setPhase("select");
        return;
      }

      setError("");
      setPhase("success");
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [course, phase, purchaseCourse, selectedMethod]);

  if (!course) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-2xl font-bold">Payment page not found</h1>
          <Link href="/dashboard/courses">
            <Button variant="outline" className="mt-4">
              Back to courses
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const continueLearningLessonId = getContinueLearningLessonId(course.id);
  const startLearningHref = continueLearningLessonId
    ? `/lesson/${continueLearningLessonId}`
    : `/course/${course.id}`;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href={`/course/${course.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to course preview
        </Link>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Payment Page
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold">
            {phase === "success" || owned ? "Payment Successful" : "Unlock Full Course"}
          </h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            {phase === "success" || owned
              ? "Your course is fully unlocked and ready for learning."
              : "Choose a payment method below to complete this frontend checkout simulation."}
          </p>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="rounded-[1.5rem] border border-border bg-background p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Course Summary
              </div>
              <h2 className="mt-3 font-display text-2xl font-bold">{paymentResult?.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{paymentResult?.description}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <div className="rounded-2xl bg-muted/50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Full Course Access
                  </div>
                  <div className="mt-1 font-display text-2xl font-bold">{paymentResult?.amount}</div>
                </div>
                <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                  All sections, lessons, tasks, and progress tracking unlock immediately after payment.
                </div>
              </div>
            </div>

            {phase === "select" && !owned && (
              <div className="mt-6 space-y-4">
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                  Payment Methods
                </div>
                {paymentMethods.map((method) => {
                  const selected = selectedMethod === method;
                  const Icon = method === "paystack" ? CreditCard : Smartphone;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedMethod(method)}
                      className={`w-full rounded-[1.5rem] border p-5 text-left transition ${
                        selected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 font-display text-2xl font-bold">
                            <Icon className="h-5 w-5 text-primary" />
                            {getPaymentMethodLabel(method)}
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            {getPaymentMethodDescription(method)}
                          </div>
                        </div>
                        {selected && (
                          <div className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                            Selected
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="accent"
                    onClick={() => {
                      setSelectedMethod("paystack");
                      setPhase("processing");
                    }}
                  >
                    Proceed with Paystack
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedMethod("opay");
                      setPhase("processing");
                    }}
                  >
                    Proceed with OPay
                  </Button>
                </div>
                {error && <div className="text-sm text-destructive">{error}</div>}
              </div>
            )}

            {phase === "processing" && (
              <div className="mt-6 rounded-[1.5rem] border border-primary/20 bg-primary/5 p-6 text-center">
                <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-primary" />
                <h2 className="mt-4 font-display text-2xl font-bold">Processing Payment...</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Simulating a secure {getPaymentMethodLabel(selectedMethod)} checkout experience.
                </p>
              </div>
            )}

            {(phase === "success" || owned) && (
              <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-6">
                <div className="flex items-center gap-2 text-emerald-700">
                  <BadgeCheck className="h-5 w-5" />
                  <div className="text-lg font-semibold">Payment Successful</div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-emerald-900">
                  <div>Course Title: {course.title}</div>
                  <div>Amount Paid: {formatNaira(course.price)}</div>
                  <div>Payment Method: {getPaymentMethodLabel(selectedMethod)}</div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/dashboard/courses">
                    <Button variant="outline">Go to My Courses</Button>
                  </Link>
                  <Link href={startLearningHref}>
                    <Button variant="accent">Start Learning</Button>
                  </Link>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                Checkout Flow
              </div>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl bg-muted/40 p-4">
                  Explore Courses -&gt; Preview Course -&gt; Unlock Course
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  Payment Page -&gt; Choose Paystack or OPay -&gt; Processing
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  Success Screen -&gt; Course added to My Courses -&gt; Start Learning
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                After Payment
              </div>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl bg-muted/40 p-4">
                  All course sections become unlocked immediately.
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  Lessons and tasks become accessible without refreshing the app.
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  Continue Learning and My Courses update automatically.
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard/payments")}>
                View Payment History
              </Button>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
