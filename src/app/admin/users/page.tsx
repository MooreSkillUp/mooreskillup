"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { adminUsers } from "@/lib/mock-data";

export default function AdminUsersPage() {
  return (
    <AppShell>
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Admin users
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold">Manage learners and roles</h1>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Courses</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((user) => (
                <tr key={user.id} className="border-t border-border">
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">{user.plan}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">{user.courses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
