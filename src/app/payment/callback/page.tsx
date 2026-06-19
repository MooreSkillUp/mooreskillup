"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Loader2, XCircle } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { verifyPayment } from "@/lib/student";

type Phase = "verifying" | "success" | "failed";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const reference = params.get("reference") ?? params.get("trxref") ?? "";
  const [phase, setPhase] = useState<Phase>("verifying");
  const [courseId, setCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setPhase("failed");
      return;
    }
    let active = true;
    verifyPayment(reference)
      .then((result) => {
        if (!active) return;
        if (result.course_unlocked) {
          setCourseId(result.courseId ?? null);
          setPhase("success");
          // Brief pause so the student sees the confirmation, then go to the course.
          setTimeout(() => {
            router.push(result.courseId ? `/course/${result.courseId}` : "/dashboard/courses");
          }, 1800);
        } else {
          setPhase("failed");
        }
      })
      .catch(() => {
        if (active) setPhase("failed");
      });
    return () => {
      active = false;
    };
  }, [reference, router]);

  return (
    <AppShell allowedRoles={["student"]}>
      <div className="mx-auto max-w-md py-20 text-center">
        {phase === "verifying" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h1 className="mt-4 font-display text-2xl font-bold">Confirming your payment…</h1>
            <p className="mt-2 text-muted-foreground">Please wait while we verify with Paystack.</p>
          </>
        )}
        {phase === "success" && (
          <>
            <BadgeCheck className="mx-auto h-12 w-12 text-success" />
            <h1 className="mt-4 font-display text-2xl font-bold">Payment successful 🎉</h1>
            <p className="mt-2 text-muted-foreground">Your course is unlocked. Taking you there…</p>
            <Link href={courseId ? `/course/${courseId}` : "/dashboard/courses"} className="mt-4 inline-block">
              <Button variant="accent">Go to course</Button>
            </Link>
          </>
        )}
        {phase === "failed" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 font-display text-2xl font-bold">We couldn&apos;t confirm your payment</h1>
            <p className="mt-2 text-muted-foreground">
              If you were charged, it will unlock automatically once Paystack confirms. You can also
              check My Courses shortly.
            </p>
            <Link href="/dashboard/courses" className="mt-4 inline-block">
              <Button variant="outline">Back to My Courses</Button>
            </Link>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
