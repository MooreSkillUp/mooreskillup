import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Courses | MooreSkillUp",
  description: "Explore all our courses.",
};

export default function CoursesPage() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Learning Paths
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
            Explore our Courses
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Browse through our extensive library of courses designed to elevate your skills.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Placeholder for courses */}
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="h-40 rounded-xl bg-gradient-to-br from-primary to-accent/80 mb-6"></div>
            <h3 className="font-display text-xl font-bold">Frontend Development</h3>
            <p className="mt-2 text-sm text-muted-foreground">Master React, Next.js, and modern CSS.</p>
          </div>
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="h-40 rounded-xl bg-gradient-to-br from-primary to-accent/80 mb-6"></div>
            <h3 className="font-display text-xl font-bold">Backend Development</h3>
            <p className="mt-2 text-sm text-muted-foreground">Learn Node.js, Python, and scalable architecture.</p>
          </div>
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="h-40 rounded-xl bg-gradient-to-br from-primary to-accent/80 mb-6"></div>
            <h3 className="font-display text-xl font-bold">UI/UX Design</h3>
            <p className="mt-2 text-sm text-muted-foreground">Design beautiful and intuitive user interfaces.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
