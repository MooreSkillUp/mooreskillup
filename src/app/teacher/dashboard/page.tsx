"use client";

import { Activity, BookOpen, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { teacherUploads } from "@/lib/mock-data";

export default function TeacherDashboardPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Teacher panel
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold">Teach, track, and improve</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            UI-only teacher workspace with upload flow, active course list, and
            simple analytics cards.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: BookOpen, label: "Published lessons", value: "36" },
            { icon: Users, label: "Learners reached", value: "1,842" },
            { icon: Activity, label: "Avg completion", value: "67%" },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <item.icon className="h-6 w-6" />
              </div>
              <div className="mt-5 font-display text-3xl font-bold">{item.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-2xl font-bold">Your active uploads</h2>
          <div className="mt-6 space-y-4">
            {teacherUploads.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-display text-xl font-bold">{item.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {item.status} · {item.learners} learners · {item.completionRate}% completion
                    </div>
                  </div>
                  <button className="rounded-xl border border-border px-4 py-2 text-sm font-medium">
                    View details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
