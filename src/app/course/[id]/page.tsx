"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Award,
  BadgeCheck,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  PlayCircle,
  Star,
  Users,
  Check,
  HelpCircle,
  Calendar,
  FileText,
  User,
} from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { SectionAccordion } from "@/components/course/SectionAccordion";
import { CourseBanner } from "@/components/course/CourseBanner";
import { formatNaira } from "@/lib/commerce";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import { enrollFree, submitReview, useCourse, useCourseReviews } from "@/lib/student";

const LEVEL_LABEL = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" } as const;

type TabType = "overview" | "curriculum" | "instructor" | "reviews";

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { user, toggleWishlist } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const { course, isLoading, error, refresh } = useCourse(courseId);
  const { reviews, refresh: refreshReviews } = useCourseReviews(courseId);
  
  const [activeTab, setActiveTab] = useState<TabType>("curriculum");
  const [enrolling, setEnrolling] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  if (isLoading) {
    return (
      <AppShell allowedRoles={["student"]}>
        <div className="space-y-6">
          <div className="h-72 animate-pulse rounded-[2rem] bg-muted/40" />
          <div className="h-16 animate-pulse rounded-2xl bg-muted/30" />
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="h-96 animate-pulse rounded-[2rem] bg-muted/40" />
            <div className="h-96 animate-pulse rounded-[2rem] bg-muted/40" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !course) {
    return (
      <AppShell allowedRoles={["student"]}>
        <div className="mx-auto max-w-md py-24 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Course not found</h1>
          <p className="mt-2 text-muted-foreground">{error || "This course may have been unpublished."}</p>
          <Link href="/dashboard/courses" className="mt-6 inline-flex items-center gap-2 font-semibold text-primary hover:underline">
            <ChevronLeft className="h-4 w-4" /> Back to courses
          </Link>
        </div>
      </AppShell>
    );
  }

  const isFree = course.price === 0;
  const showDiscount = course.discountPrice !== null && course.discountPrice < course.price;
  const firstLesson = course.sections.flatMap((s) => s.lessons)[0];
  const totalLessons = course.sections.reduce((sum, s) => sum + s.lessons.length, 0);

  const onEnroll = async () => {
    if (course.isOwned) {
      router.push(firstLesson ? `/lesson/${firstLesson.id}` : "/dashboard/courses");
      return;
    }
    if (isFree) {
      try {
        setEnrolling(true);
        await enrollFree(course.id);
        notifySuccess("Enrolled!", "You now have access. Happy learning.");
        await refresh();
        router.push(firstLesson ? `/lesson/${firstLesson.id}` : "/dashboard/courses");
      } catch (e) {
        notifyError("Unable to enroll", e instanceof Error ? e.message : "Request failed.");
      } finally {
        setEnrolling(false);
      }
    } else {
      router.push(`/payment/${course.id}`);
    }
  };

  const ctaLabel = course.isOwned ? "Go to course" : isFree ? "Enroll for free" : "Buy this course";

  return (
    <AppShell allowedRoles={["student"]}>
      <div className="space-y-6">
        
        {/* ── Breadcrumbs on Top ───────────────────────────────────────── */}
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/dashboard/courses" className="hover:text-foreground">Courses</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-semibold">{course.title}</span>
        </div>

        {/* ── Top Hero Banner ─────────────────────────────────────────── */}
        <CourseBanner
          title={course.title}
          subtitle={course.subtitle}
          category={course.program}
          track={course.track}
          level={LEVEL_LABEL[course.level]}
          durationLabel={`${totalLessons} lessons`}
          priceLabel={isFree ? "Free" : showDiscount ? formatNaira(course.discountPrice as number) : formatNaira(course.price)}
          certificateEnabled={course.certificateEnabled}
          bannerImage={course.bannerImage}
          bannerTheme={course.bannerTheme ?? "default"}
          categoryAccentColor={course.categoryAccentColor}
          isBookmarked={course.isInWatchlist}
          onBookmarkToggle={user?.role === "student" ? () => toggleWishlist(course.id) : undefined}
        />

        {/* ── Floating Stats & Actions Row ────────────────────────────── */}
        <div className="relative -mt-10 mx-4 md:mx-6 rounded-[20px] border border-border bg-card p-4 shadow-lg z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="grid grid-cols-4 gap-4 divide-x divide-border flex-1">
            <div className="text-center md:text-left px-2">
              <div className="text-lg font-extrabold text-foreground">{course.enrollments}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Enrolled</div>
            </div>
            <div className="text-center md:text-left px-4">
              <div className="text-lg font-extrabold text-foreground">{totalLessons}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lessons</div>
            </div>
            <div className="text-center md:text-left px-4">
              <div className="text-lg font-extrabold text-foreground">{LEVEL_LABEL[course.level]}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Level</div>
            </div>
            <div className="text-center md:text-left px-4">
              <div className="text-lg font-extrabold text-foreground">{totalLessons ? `${totalLessons * 10}m` : "Oh 0m"}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Duration</div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="accent"
              className="rounded-full px-6 font-bold shadow-md hover:shadow-lg transition flex-1 md:flex-none"
              onClick={() => void onEnroll()}
              loading={enrolling}
            >
              🛒 {ctaLabel}
            </Button>
            {user?.role === "student" && (
              <Button
                variant="outline"
                className="rounded-full px-4"
                onClick={() => void toggleWishlist(course.id)}
              >
                <Heart className={`h-4 w-4 ${course.isInWatchlist ? "fill-current text-primary" : ""}`} />
                {course.isInWatchlist ? "In Wishlist" : "Add to Wishlist"}
              </Button>
            )}
          </div>
        </div>

        {/* ── Tabs Navigation ─────────────────────────────────────────── */}
        <div className="border-b border-border">
          <div className="flex gap-8">
            {(["overview", "curriculum", "instructor", "reviews"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-semibold capitalize transition-all border-b-2 -mb-[2px] ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── Two-Column Layout ───────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          
          {/* ── Left Content (Dynamic Tab Area) ────────────────────────── */}
          <div className="space-y-6 min-w-0">
            
            {activeTab === "overview" && (
              <section className="rounded-[20px] border border-border bg-card p-6 shadow-sm">
                <h3 className="font-display text-lg font-bold text-foreground">About this course</h3>
                <div
                  className="prose prose-sm mt-4 max-w-none text-muted-foreground dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: course.overview || "<p>No description yet.</p>" }}
                />
              </section>
            )}

            {activeTab === "curriculum" && (
              <section className="rounded-[20px] border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">Course Content</h3>
                    <p className="text-xs text-muted-foreground">
                      {course.sections.length} sections · {totalLessons} lessons
                    </p>
                  </div>
                  <button className="text-xs font-semibold text-primary hover:underline">
                    Expand all ∨
                  </button>
                </div>

                <SectionAccordion
                  sections={course.sections.map((section) => ({
                    id: section.id,
                    title: section.title,
                    lessonCount: section.lessons.length,
                    lessons: section.lessons.map((lesson) => ({
                      id: lesson.id,
                      title: lesson.title,
                      type: lesson.type,
                      isPreviewable: lesson.isPreviewable,
                      isLocked: section.isLocked,
                    })),
                    assignments: section.assignments.map((a) => ({ id: a.id, title: a.title })),
                    projects: section.projects.map((p) => ({ id: p.id, title: p.title })),
                    isFree: section.isFree,
                    isLocked: section.isLocked,
                  }))}
                  courseOwned={course.isOwned}
                  previewHrefBuilder={(lessonId) => `/lesson/${lessonId}`}
                />
              </section>
            )}

            {activeTab === "instructor" && (
              <section className="rounded-[20px] border border-border bg-card p-6 shadow-sm">
                <h3 className="font-display text-lg font-bold text-foreground">About the Instructor</h3>
                <div className="mt-4 flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-foreground">{course.teacherName}</h4>
                    <p className="text-xs text-primary font-semibold">Instructor</p>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      Empowering learners to build, learn and grow in tech. We specialize in producing real-world, industry-standard courses that map to modern career paths.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {activeTab === "reviews" && (
              <section className="rounded-[20px] border border-border bg-card p-6 shadow-sm">
                <h3 className="font-display text-lg font-bold text-foreground">Course Reviews</h3>
                {course.isOwned && (
                  <div className="mt-4 rounded-xl border border-border bg-background p-4">
                    <div className="text-sm font-semibold">Rate this course</div>
                    <div className="mt-2 flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button key={i} type="button" onClick={() => setMyRating(i + 1)}>
                          <Star className={`h-6 w-6 ${i < myRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={myComment}
                      onChange={(e) => setMyComment(e.target.value)}
                      placeholder="Share your thoughts about this course..."
                      className="mt-3 min-h-20 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none"
                    />
                    <Button
                      variant="accent"
                      size="sm"
                      className="mt-2"
                      disabled={myRating === 0}
                      loading={reviewSaving}
                      onClick={async () => {
                        try {
                          setReviewSaving(true);
                          await submitReview(course.id, myRating, myComment.trim());
                          notifySuccess("Review submitted successfully!");
                          setMyComment("");
                          setMyRating(0);
                          await refreshReviews();
                          await refresh();
                        } catch (e) {
                          notifyError("Submission failed", e instanceof Error ? e.message : "Error submitting review.");
                        } finally {
                          setReviewSaving(false);
                        }
                      }}
                    >
                      Submit Review
                    </Button>
                  </div>
                )}

                <div className="mt-6 space-y-4">
                  {reviews.length ? (
                    reviews.map((r) => (
                      <div key={r.id} className="rounded-xl border border-border p-4">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm">{r.studentName}</span>
                          <span className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                            ))}
                          </span>
                        </div>
                        {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No reviews yet.</p>
                  )}
                </div>
              </section>
            )}

          </div>

          {/* ── Right Column (Sidebar) ─────────────────────────────────── */}
          <aside className="space-y-6">
            
            {/* This Course Includes Card */}
            <div className="rounded-[20px] border border-border bg-card p-5 shadow-sm space-y-4">
              <h4 className="font-display text-sm font-bold text-foreground">This course includes</h4>
              <ul className="space-y-3 text-xs text-muted-foreground">
                <li className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>{totalLessons} Lessons</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{totalLessons ? `${totalLessons * 10}m` : "Oh 0m"} On-demand video</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span>Full lifetime access</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Access on mobile and desktop</span>
                </li>
                {course.certificateEnabled && (
                  <li className="flex items-center gap-2.5">
                    <Award className="h-4 w-4 text-primary" />
                    <span>Certificate of completion</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Instructor Quick Card */}
            <div className="rounded-[20px] border border-border bg-card p-5 shadow-sm space-y-4">
              <h4 className="font-display text-sm font-bold text-foreground">Instructor</h4>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-foreground truncate">{course.teacherName}</div>
                  <div className="text-[10px] text-primary font-bold uppercase tracking-wider">Instructor</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Empowering learners to build, learn and grow in tech.
              </p>
              <button
                onClick={() => setActiveTab("instructor")}
                className="w-full text-center py-2 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                View Profile
              </button>
            </div>

            {/* What you'll learn checklist */}
            <div className="rounded-[20px] border border-border bg-card p-5 shadow-sm space-y-4">
              <h4 className="font-display text-sm font-bold text-foreground">What you&apos;ll learn</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Build responsive and modern websites</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Understand HTML, CSS, and JavaScript</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Create real-world frontend projects</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Follow best practices in web development</span>
                </li>
              </ul>
            </div>

          </aside>
        </div>

        {/* ── Reviews & Ratings Section (Bottom Full Width) ────────────── */}
        <section className="rounded-[20px] border border-border bg-card p-6 shadow-sm">
          <h3 className="font-display text-lg font-bold text-foreground mb-6">Reviews & Ratings</h3>
          <div className="grid gap-6 md:grid-cols-[1fr_2fr_1fr] items-center">
            {/* Big rating box */}
            <div className="text-center space-y-2">
              <div className="text-5xl font-black text-foreground">
                {course.averageRating ? course.averageRating.toFixed(1) : "0.0"}
              </div>
              <div className="flex justify-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.round(course.averageRating || 0)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                {course.reviewCount || 0} reviews
              </div>
            </div>

            {/* Distribution bars */}
            <div className="space-y-2.5 px-4">
              {[5, 4, 3, 2, 1].map((stars) => {
                // simple mock distribution for UI polish matching image
                const pct = course.reviewCount
                  ? stars === 5
                    ? 80
                    : stars === 4
                    ? 15
                    : 5
                  : 0;
                return (
                  <div key={stars} className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="w-3 text-right">{stars}</span>
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>

            {/* CTA review box */}
            <div className="text-center p-4 border border-dashed border-border rounded-2xl bg-muted/20">
              <div className="text-sm font-semibold text-foreground mb-1">
                {reviews.length ? "Share your feedback" : "No reviews yet"}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {reviews.length
                  ? "Help other students by writing a review."
                  : "Be the first to review this course."}
              </p>
              <Button
                variant="accent"
                size="sm"
                className="rounded-full px-5 font-bold"
                onClick={() => setActiveTab("reviews")}
              >
                Write a Review
              </Button>
            </div>
          </div>
        </section>

      </div>
    </AppShell>
  );
}
