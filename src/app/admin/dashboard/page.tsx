"use client";

import Link from "next/link";
import { BarChart3, FolderKanban, Shield, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";

export default function AdminDashboardPage() {
  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Admin panel
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Platform control room</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              UI-only management area for course operations, user oversight, role mapping,
              and backend-ready workflows.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/admin-register">
              <Button variant="accent">
                <UserPlus className="h-4 w-4" /> Create admin account
              </Button>
            </Link>
            <Link href="/auth/teacher-register">
              <Button variant="outline">Create teacher account</Button>
            </Link>
          </div>
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

        <div className="grid gap-5 lg:grid-cols-3">
          {[
            {
              title: "Course operations",
              body: "Add, edit, archive, and schedule academy programs with week-by-week course structure.",
              href: "/admin/courses",
            },
            {
              title: "User and role management",
              body: "Review learners, teachers, plans, and role assignments before wiring real backend auth.",
              href: "/admin/users",
            },
            {
              title: "Teacher approvals",
              body: "Provision teacher accounts, review ownership by program/track, and keep publishing rights controlled from admin.",
              href: "/auth/teacher-register",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="font-display text-2xl font-bold">{item.title}</div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
              <Link href={item.href} className="mt-5 inline-flex text-sm font-semibold text-primary">
                Open route
              </Link>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
