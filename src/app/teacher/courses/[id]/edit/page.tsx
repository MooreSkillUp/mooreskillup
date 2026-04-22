"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/dashboard/AppShell";
import { TeacherCourseEditor } from "@/components/teacher/TeacherCourseEditor";

export default function TeacherEditCoursePage() {
  const params = useParams();

  return (
    <AppShell allowedRoles={["teacher", "admin"]}>
      <TeacherCourseEditor mode="edit" courseId={params.id as string} />
    </AppShell>
  );
}
