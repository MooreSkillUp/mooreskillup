"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { TeacherCourseEditor } from "@/components/teacher/TeacherCourseEditor";

export default function TeacherCreateCoursePage() {
  return (
    <AppShell allowedRoles={["teacher", "admin"]}>
      <TeacherCourseEditor mode="create" />
    </AppShell>
  );
}
