"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Award,
  BadgeCheck,
  ClipboardCheck,
  Heart,
  Lock,
  PlayCircle,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { CourseBanner, CourseBannerHighlight } from "@/components/course/CourseBanner";
import { SectionAccordion } from "@/components/course/SectionAccordion";
import { formatNaira } from "@/lib/commerce";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import { enrollFree, submitReview, useCourse, useCourseReviews } from "@/lib/student";

const LEVEL_LABEL = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" } as const;

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { user, toggleWishlist } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const { course, isLoading, error, refresh } = useCourse(courseId);
  const { reviews, refresh: refreshReviews } = useCourseReviews(courseId);
  const [enrolling, setEnrolling] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  if (isLoading) {
    return (
      <AppShell allowedRoles={["student"]}>
        <div className="h-96 animate-pulse rounded-[2rem] bg-muted/40" />
      </AppShell>
    );
  }

  if (error || !course) {
    return (
      <AppShell allowedRoles={["student"]}>
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="font-display text-2xl font-bold">Course not found</h1>
          <p className="mt-2 text-muted-foreground">{error || "This course may have been unpublished."}</p>
          <Link href="/dashboard/courses" className="mt-4 inline-block font-semibold text-primary">
            Back to courses
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
      <div className="space-y-8">
        <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
          <div className="p-4 lg:p-6">
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
            />
          </div>
          <div className="grid gap-6 p-6 lg:grid-cols-[1.55fr_0.95fr] lg:p-8">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{LEVEL_LABEL[course.level]}</span>
                <span className="rounded-full bg-card px-3 py-1 text-muted-foreground shadow-sm">
                  {course.program} · {course.track}
                </span>
                {course.certificateEnabled && (
                  <span className="flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-success">
                    <Award className="h-3.5 w-3.5" /> Certificate
                  </span>
                )}
              </div>
              <h1 className="mt-4 font-display text-4xl font-bold leading-tight">{course.title}</h1>
              <p className="mt-3 text-lg text-muted-foreground">{course.subtitle}</p>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {course.reviewCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <strong className="text-foreground">{course.averageRating}</strong> ({course.reviewCount} reviews)
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" /> {course.enrollments} enrolled
                </span>
                <span>{totalLessons} lessons</span>
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                Produced by <strong className="text-foreground">MooreSkillUp</strong>
              </div>

              {course.techStack.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {course.techStack.map((tech) => (
                    <span key={tech} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="self-start rounded-[1.5rem] border border-border bg-card p-6 shadow-lg lg:sticky lg:top-6">
              <div className="font-display text-3xl font-bold">
                {isFree ? (
                  <span className="text-success">Free</span>
                ) : showDiscount ? (
                  <span className="flex items-baseline gap-2">
                    {formatNaira(course.discountPrice as number)}
                    <span className="text-base font-normal text-muted-foreground line-through">
                      {formatNaira(course.price)}
                    </span>
                  </span>
                ) : (
                  formatNaira(course.price)
                )}
              </div>
              {course.isOwned && (
                <div className="mt-2 flex items-center gap-1 text-sm font-medium text-success">
                  <BadgeCheck className="h-4 w-4" /> You own this course
                </div>
              )}
              <Button
                variant="accent"
                size="lg"
                className="mt-4 w-full"
                onClick={() => void onEnroll()}
                loading={enrolling}
                loadingText="Enrolling..."
              >
                {ctaLabel}
              </Button>
              {user?.role === "student" && (
                <Button variant="outline" className="mt-2 w-full" onClick={() => void toggleWishlist(course.id)}>
                  <Heart className={`h-4 w-4 ${course.isInWatchlist ? "fill-current" : ""}`} />
                  {course.isInWatchlist ? "In your wishlist" : "Add to wishlist"}
                </Button>
              )}
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                <li>✓ Full lifetime access</li>
                <li>✓ Learn at your own pace</li>
                {course.certificateEnabled && <li>✓ Certificate of completion</li>}
                <li>✓ Free preview lessons below</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="space-y-8">
            <div className="grid gap-3 sm:grid-cols-3">
              <CourseBannerHighlight title="Structured learning" caption="Sections, lessons, and milestones" />
              <CourseBannerHighlight title="Career-ready" caption="Skills that map to modern roles" />
              <CourseBannerHighlight title="Premium experience" caption="Professional learning flow" />
            </div>

            <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl font-bold">About this course</h2>
              </div>
              <div
                className="prose prose-sm mt-4 max-w-none text-muted-foreground dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: course.overview || "<p>No description yet.</p>" }}
              />
              {course.roadmapLink && (
                <a href={course.roadmapLink} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-semibold text-primary">
                  View the learning roadmap →
                </a>
              )}
            </section>

            <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl font-bold">Course content</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {course.sections.length} sections · {totalLessons} lessons
              </p>
              <div className="mt-4">
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
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-2xl font-bold">
                Reviews {course.reviewCount > 0 && <span className="text-muted-foreground">· {course.averageRating} ★ ({course.reviewCount})</span>}
              </h2>

              {course.isOwned && (
                <div className="mt-4 rounded-[1.25rem] border border-border bg-background p-5">
                  <div className="text-sm font-medium">Rate this course</div>
                  <div className="mt-2 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button key={i} type="button" onClick={() => setMyRating(i + 1)} aria-label={`${i + 1} stars`}>
                        <Star className={`h-6 w-6 ${i < myRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={myComment}
                    onChange={(e) => setMyComment(e.target.value)}
                    placeholder="Share what you thought (optional)"
                    className="mt-3 min-h-20 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none"
                    style={{ direction: "ltr" }}
                  />
                  <Button
                    variant="accent"
                    size="sm"
                    className="mt-2"
                    disabled={myRating === 0}
                    loading={reviewSaving}
                    loadingText="Submitting..."
                    onClick={async () => {
                      try {
                        setReviewSaving(true);
                        await submitReview(course.id, myRating, myComment.trim());
                        notifySuccess("Thanks for your review!");
                        setMyComment("");
                        setMyRating(0);
                        await refreshReviews();
                        await refresh();
                      } catch (e) {
                        notifyError(
                          "Couldn't submit review",
                          e instanceof Error ? e.message : "You can review after completing at least half the course.",
                        );
                      } finally {
                        setReviewSaving(false);
                      }
                    }}
                  >
                    Submit review
                  </Button>
                </div>
              )}

              {!reviews.length ? (
                <p className="mt-2 text-sm text-muted-foreground">No reviews yet. Be the first after you start learning.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-[1.25rem] border border-border bg-background p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{review.studentName}</span>
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`}
                            />
                          ))}
                        </span>
                      </div>
                      {review.comment && <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm">
              <h3 className="font-display text-lg font-bold">This course includes</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>{totalLessons} lessons across {course.sections.length} sections</li>
                <li>Video, reading, and resource lessons</li>
                <li>Assignments &amp; projects</li>
                {course.certificateEnabled && <li>Certificate of completion</li>}
              </ul>
            </div>
            <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm">
              <h3 className="font-display text-lg font-bold">Learning path</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                This course is part of the MooreSkillUp learning experience and supports your broader career roadmap.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
