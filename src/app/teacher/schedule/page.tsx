"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { ScheduleManager } from "@/components/schedule/ScheduleManager";

export default function TeacherSchedulePage() {
  return (
    <AppShell allowedRoles={["teacher"]}>
      <ScheduleManager scope="teacher" />
    </AppShell>
  );
}
