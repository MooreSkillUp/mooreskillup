"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/dashboard/AppShell";
import { LearnerCoursePreview } from "@/components/teacher/LearnerCoursePreview";
import { Button } from "@/components/ui-kit/Button";
import { useTeacherPlatform } from "@/lib/teacher-platform";

export default function TeacherCoursePreviewPage() {
  const params = useParams();
  const { getCourseById } = useTeacherPlatform();
  const course = getCourseById(params.id as string);

  if (!course) {
    return (
      <AppShell allowedRoles={["teacher", "admin"]}>
        <div className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="font-display text-3xl font-bold">Course not found</h1>
          <Link href="/teacher/courses">
            <Button variant="outline" className="mt-4">
              Back to my courses
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell allowedRoles={["teacher", "admin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Preview mode
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Learner view preview</h1>
          </div>
          <Link href={`/teacher/courses/${course.id}/edit`}>
            <Button variant="outline">Back to editor</Button>
          </Link>
        </div>
        <LearnerCoursePreview course={course} />
      </div>
    </AppShell>
  );
}
