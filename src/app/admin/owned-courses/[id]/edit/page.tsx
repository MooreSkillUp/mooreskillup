"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/dashboard/AppShell";
import { TeacherCourseEditor } from "@/components/teacher/TeacherCourseEditor";

export default function AdminOwnedCourseEditPage() {
  const params = useParams();

  return (
    <AppShell allowedRoles={["admin"]}>
      <TeacherCourseEditor mode="edit" courseId={params.id as string} platformMode="admin-owned" />
    </AppShell>
  );
}
