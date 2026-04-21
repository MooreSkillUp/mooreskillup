"use client";

import Link from "next/link";
import { ShieldCheck, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { adminUsers } from "@/lib/mock-data";

export default function AdminUsersPage() {
  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Admin users
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Manage learners, teachers, and roles</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Keep role assignment, plan access, and ownership by program and track organized from
              one admin view.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/teacher-register">
              <Button variant="accent">
                <UserPlus className="h-4 w-4" /> Add teacher
              </Button>
            </Link>
            <Link href="/auth/admin-register">
              <Button variant="outline">Add admin</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Users, label: "Users on platform", value: "4,218" },
            { icon: ShieldCheck, label: "Managed roles", value: "3" },
            { icon: UserPlus, label: "Pending invites", value: "12" },
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

        <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-5">
            <div className="font-display text-2xl font-bold">Role table</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Teachers should always be tied to the program and track they own.
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Track</th>
                  <th className="px-4 py-3">Courses</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((user) => (
                  <tr key={user.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3">{user.plan}</td>
                    <td className="px-4 py-3">{user.role}</td>
                    <td className="px-4 py-3">{user.program}</td>
                    <td className="px-4 py-3">{user.track}</td>
                    <td className="px-4 py-3">{user.courses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
