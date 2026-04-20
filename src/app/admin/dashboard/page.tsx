"use client";

import { BarChart3, FolderKanban, Shield, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";

export default function AdminDashboardPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Admin panel
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold">Platform control room</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            UI-only management area for course operations, user oversight, and
            system-level visibility before backend integration.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Users, label: "Active learners", value: "4,218" },
            { icon: FolderKanban, label: "Published courses", value: "24" },
            { icon: BarChart3, label: "Avg completion", value: "68%" },
            { icon: Shield, label: "Admin actions", value: "143" },
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
      </div>
    </AppShell>
  );
}
