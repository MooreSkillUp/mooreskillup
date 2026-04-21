"use client";

import Link from "next/link";
import { ShieldCheck, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { getTeacherRows } from "@/lib/mock-data";

export default function AdminUsersPage() {
  const teachers = getTeacherRows();
  const activeTeachers = teachers.filter((teacher) => teacher.isActive).length;

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Teacher management
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Manage tutor access and ownership</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Deleting a teacher removes login access only. Courses stay active and move to Admin
              ownership so nothing is lost.
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
            { icon: Users, label: "Total teachers", value: `${teachers.length}` },
            { icon: ShieldCheck, label: "Active teachers", value: `${activeTeachers}` },
            { icon: UserPlus, label: "Disabled / reassigned", value: `${teachers.length - activeTeachers}` },
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
            <div className="font-display text-2xl font-bold">Tutor roles table</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Teachers only. Deleted teachers are shown as disabled and their courses stay live
              under Admin ownership.
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Track</th>
                  <th className="px-4 py-3">Courses</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{teacher.name}</td>
                    <td className="px-4 py-3">{teacher.role}</td>
                    <td className="px-4 py-3">{teacher.program}</td>
                    <td className="px-4 py-3">{teacher.track}</td>
                    <td className="px-4 py-3">{teacher.numberOfCourses}</td>
                    <td className="px-4 py-3">
                      {teacher.isActive ? "Active" : "Disabled / Admin ownership"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                      >
                        {teacher.isActive ? "Delete safely" : "Reassigned"}
                      </button>
                    </td>
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
