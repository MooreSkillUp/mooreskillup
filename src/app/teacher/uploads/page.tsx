"use client";

import { Trash2 } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { useTeacherWorkspace } from "@/lib/teacher-workspace";

export default function TeacherUploadsPage() {
  const { activities, clearTeacherActivities } = useTeacherWorkspace();

  return (
    <AppShell allowedRoles={["teacher", "admin"]}>
      <div className="space-y-6">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Current uploads
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold">Instructor activity log</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Review recent actions like lesson additions, section edits, draft saves, publishing events, and profile updates. Logs auto-expire after 24 hours.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={clearTeacherActivities}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-4 w-4" />
            Clear logs
          </button>
        </div>

        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={activity.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-3 w-3 rounded-full bg-primary" />
                {index < activities.length - 1 && <div className="mt-2 h-full w-px bg-border" />}
              </div>
              <div className="flex-1 rounded-3xl border border-border bg-card p-5 shadow-sm">
                <div className="font-medium">{activity.message}</div>
                <div className="mt-1 text-sm text-muted-foreground">{activity.timestamp}</div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {activity.type}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
