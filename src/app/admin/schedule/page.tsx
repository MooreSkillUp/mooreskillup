"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { ScheduleManager } from "@/components/schedule/ScheduleManager";

export default function AdminSchedulePage() {
  return (
    <AppShell allowedRoles={["admin"]}>
      <ScheduleManager scope="admin" />
    </AppShell>
  );
}
