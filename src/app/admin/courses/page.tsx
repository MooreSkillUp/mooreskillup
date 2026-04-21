"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { academyPrograms, courses } from "@/lib/mock-data";

export default function AdminCoursesPage() {
  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h1 className="font-display text-3xl font-bold">Add or edit a course</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            UI-only form for future admin course workflows with academy path, track,
            week structure, and access rules.
          </p>

          <form className="mt-6 space-y-4">
            <Input label="Course title" placeholder="Backend with Python API Builder" />
            <Input label="Instructor" placeholder="Dr. Lena Park" />
            <Input label="Academy path" placeholder="Backend Development" />
            <Input label="Track" placeholder="Backend with Python" />
            <Input label="Access tier" placeholder="Free, Pro, or Premium" />
            <Input label="Availability day" placeholder="Monday" />
            <Input label="Week structure" placeholder="Week 1 foundations, Week 2 APIs, Week 3 Django..." />
            <Button variant="accent" className="w-full">
              Save draft
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold">Existing learner tracks</h2>
              <Button variant="outline">Bulk actions</Button>
            </div>
            <div className="mt-6 space-y-4">
              {courses.map((course) => (
                <div key={course.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-display text-xl font-bold">{course.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {course.interest} | {course.track} | {course.access} | {course.level}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm">
                        Archive
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-2xl font-bold">Program map</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {academyPrograms.map((program) => (
                <div key={program.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="font-display text-lg font-bold">{program.title}</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {program.branches.length} tracks ready for backend wiring.
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
