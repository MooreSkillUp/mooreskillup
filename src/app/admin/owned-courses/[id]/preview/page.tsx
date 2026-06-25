"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/dashboard/AppShell";
import { LearnerCoursePreview } from "@/components/teacher/LearnerCoursePreview";
import { Button } from "@/components/ui-kit/Button";
import { useTeacherPlatform } from "@/lib/teacher-platform";

export default function AdminOwnedCoursePreviewPage() {
  const params = useParams();
  const { getCourseById, isLoading } = useTeacherPlatform({ platformMode: "admin-owned", courseId: params.id as string });
  const course = getCourseById(params.id as string);

  if (isLoading && !course) {
    return (
      <AppShell allowedRoles={["admin"]}>
        <div className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="font-display text-3xl font-bold">Loading preview...</h1>
        </div>
      </AppShell>
    );
  }

  if (!course) {
    return (
      <AppShell allowedRoles={["admin"]}>
        <div className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="font-display text-3xl font-bold">Course not found</h1>
          <Link href="/admin/owned-courses">
            <Button variant="outline" className="mt-4">
              Back to admin-owned courses
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Preview mode
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Course learner preview</h1>
          </div>
          <Link href={`/admin/owned-courses/${course.id}/edit`}>
            <Button variant="outline">Back to editor</Button>
          </Link>
        </div>
        <LearnerCoursePreview course={course} />
      </div>
    </AppShell>
  );
}
