"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";

export default function TeacherUploadPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Teacher upload
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold">Upload a course module</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Frontend-only course upload experience ready for backend wiring later.
          </p>
        </div>

        <form className="mt-8 grid gap-4 md:grid-cols-2">
          <Input label="Course title" placeholder="System Design for Backend Builders" />
          <Input label="Track" placeholder="Backend" />
          <Input label="Module title" placeholder="Scaling APIs" />
          <Input label="Video link" placeholder="https://youtube.com/..." />
          <div className="md:col-span-2">
            <Input label="Summary" placeholder="What will learners gain from this module?" />
          </div>
          <div className="md:col-span-2 flex gap-3">
            <Button variant="accent">Save draft</Button>
            <Button variant="outline">Preview course</Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
