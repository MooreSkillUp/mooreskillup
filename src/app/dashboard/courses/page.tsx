"use client";

import { useMemo, useState } from "react";
import { BookOpen, Compass, GraduationCap, Search, Sparkles } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { StudentCourseCard } from "@/components/student/StudentCourseCard";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import {
  useCatalog,
  useMyCourses,
  useRecommended,
  useStudentTaxonomy,
  type CatalogFilters,
  type StudentCourse,
} from "@/lib/student";

type TabKey = "my-courses" | "browse" | "recommended" | "all-courses";

const TABS: { key: TabKey; label: string; icon: typeof BookOpen }[] = [
  { key: "my-courses", label: "My Courses", icon: GraduationCap },
  { key: "browse", label: "Browse", icon: Compass },
  { key: "recommended", label: "Recommended", icon: Sparkles },
  { key: "all-courses", label: "All Courses", icon: BookOpen },
];

const LEVELS = [
  { value: "", label: "All levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const SORTS: { value: NonNullable<CatalogFilters["sort"]>; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Top rated" },
  { value: "price-low", label: "Price: low to high" },
  { value: "price-high", label: "Price: high to low" },
];

function EmptyState({ icon: Icon, title, hint }: { icon: typeof BookOpen; title: string; hint: string }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-border bg-card p-12 text-center">
      <Icon className="mx-auto h-10 w-10 text-muted-foreground" />
      <h3 className="mt-4 font-display text-xl font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function CourseGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function SkeletonGrid() {
  return (
    <CourseGrid>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-72 animate-pulse rounded-[1.5rem] border border-border bg-muted/40" />
      ))}
    </CourseGrid>
  );
}

export default function StudentCoursesPage() {
  const { user, toggleWishlist } = useAuth();
  const { notifyError } = useFeedback();
  const [tab, setTab] = useState<TabKey>("my-courses");

  const isStudent = user?.role === "student";
  const { enrollments, isLoading: myLoading } = useMyCourses(isStudent);
  const { courses: recommended, isLoading: recLoading } = useRecommended(isStudent);
  const { taxonomy, categories } = useStudentTaxonomy();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [track, setTrack] = useState("");
  const [level, setLevel] = useState("");
  const [price, setPrice] = useState<CatalogFilters["price"]>("");
  const [sort, setSort] = useState<CatalogFilters["sort"]>("newest");
  const [page, setPage] = useState(1);

  const filters: CatalogFilters = useMemo(
    () => ({ search, category, track, level, price, sort, page }),
    [search, category, track, level, price, sort, page],
  );
  const { courses, count, hasNext, isLoading: catalogLoading } = useCatalog(filters);

  const trackOptions = useMemo(
    () => taxonomy.find((t) => t.category === category)?.tracks ?? [],
    [taxonomy, category],
  );

  const onWishlist = async (course: StudentCourse) => {
    try {
      await toggleWishlist(course.id);
    } catch (error) {
      notifyError("Wishlist failed", error instanceof Error ? error.message : "Request failed.");
    }
  };

  const inProgress = enrollments.filter((e) => e.status !== "completed" && e.progressPercent > 0);
  const notStarted = enrollments.filter((e) => e.status !== "completed" && e.progressPercent === 0);
  const completed = enrollments.filter((e) => e.status === "completed");

  return (
    <AppShell allowedRoles={["student"]}>
      <div className="space-y-6">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Courses</div>
          <h1 className="mt-2 font-display text-4xl font-bold">Your learning hub</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Pick up where you left off, discover new courses, or explore the full catalog.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                tab === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "my-courses" && (
          <div className="space-y-8">
            {myLoading ? (
              <SkeletonGrid />
            ) : !enrollments.length ? (
              <EmptyState
                icon={GraduationCap}
                title="You haven't enrolled in any course yet"
                hint="Browse the catalog and start learning — free courses unlock instantly."
              />
            ) : (
              <>
                {inProgress.length > 0 && (
                  <section>
                    <h2 className="mb-4 font-display text-2xl font-bold">In progress</h2>
                    <CourseGrid>
                      {inProgress.map((e) => (
                        <StudentCourseCard key={e.enrollmentId} course={e.course} enrollment={e} />
                      ))}
                    </CourseGrid>
                  </section>
                )}
                {notStarted.length > 0 && (
                  <section>
                    <h2 className="mb-4 font-display text-2xl font-bold">Not started</h2>
                    <CourseGrid>
                      {notStarted.map((e) => (
                        <StudentCourseCard key={e.enrollmentId} course={e.course} enrollment={e} />
                      ))}
                    </CourseGrid>
                  </section>
                )}
                {completed.length > 0 && (
                  <section>
                    <h2 className="mb-4 font-display text-2xl font-bold">Completed</h2>
                    <CourseGrid>
                      {completed.map((e) => (
                        <StudentCourseCard key={e.enrollmentId} course={e.course} enrollment={e} />
                      ))}
                    </CourseGrid>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {tab === "recommended" && (
          <div>
            {recLoading ? (
              <SkeletonGrid />
            ) : !recommended.length ? (
              <EmptyState
                icon={Sparkles}
                title="No recommendations yet"
                hint="Set your interests in Settings, or browse all courses to get started."
              />
            ) : (
              <CourseGrid>
                {recommended.map((course) => (
                  <StudentCourseCard key={course.id} course={course} onToggleWishlist={onWishlist} />
                ))}
              </CourseGrid>
            )}
          </div>
        )}

        {(tab === "browse" || tab === "all-courses") && (
          <div className="space-y-5">
            <div className="rounded-[1.5rem] border border-border bg-card p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search courses, topics, tools..."
                  className="pl-9"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setTrack("");
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={track}
                  onChange={(e) => {
                    setTrack(e.target.value);
                    setPage(1);
                  }}
                  disabled={!trackOptions.length}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-50"
                >
                  <option value="">All tracks</option>
                  {trackOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  value={level}
                  onChange={(e) => {
                    setLevel(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  {LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <select
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value as CatalogFilters["price"]);
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">Free &amp; paid</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as CatalogFilters["sort"])}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {catalogLoading ? (
              <SkeletonGrid />
            ) : !courses.length ? (
              <EmptyState icon={Compass} title="No courses match your filters" hint="Try clearing some filters or searching for something else." />
            ) : (
              <>
                <div className="text-sm text-muted-foreground">
                  {count} course{count === 1 ? "" : "s"}
                </div>
                <CourseGrid>
                  {courses.map((course) => (
                    <StudentCourseCard key={course.id} course={course} onToggleWishlist={onWishlist} />
                  ))}
                </CourseGrid>
                {(page > 1 || hasNext) && (
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {page}</span>
                    <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage(page + 1)}>
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
