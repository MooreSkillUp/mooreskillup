"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Award,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileText,
  FolderGit2,
  Heart,
  Lock,
  PlayCircle,
  ScrollText,
  Star,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
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
  const [openSections, setOpenSections] = useState<string[]>([]);
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
        {/* Hero */}
        <div className="overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-primary/10 via-background to-accent-soft">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.6fr_1fr] lg:p-8">
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
                Produced by <strong className="text-foreground">MooreSkillUp</strong> · Instructor {course.teacherName}
              </div>

              {course.techStack.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {course.techStack.map((tech) => (
                    <span key={tech} className="rounded-full bg-card px-3 py-1 text-xs font-medium text-foreground shadow-sm">
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Pricing card */}
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

        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-8">
            {/* About */}
            <section>
              <h2 className="font-display text-2xl font-bold">About this course</h2>
              <div
                className="prose prose-sm mt-3 max-w-none text-muted-foreground dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: course.overview || "<p>No description yet.</p>" }}
              />
              {course.roadmapLink && (
                <a href={course.roadmapLink} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-primary">
                  View the learning roadmap →
                </a>
              )}
            </section>

            {/* Curriculum */}
            <section>
              <h2 className="font-display text-2xl font-bold">Course content</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {course.sections.length} sections · {totalLessons} lessons
              </p>
              <div className="mt-4 space-y-3">
                {course.sections.map((section, index) => {
                  const isOpen = openSections.includes(section.id);
                  const locked = section.isLocked;
                  return (
                    <div key={section.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenSections((cur) =>
                            cur.includes(section.id) ? cur.filter((id) => id !== section.id) : [...cur, section.id],
                          )
                        }
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                      >
                        <div className="flex items-center gap-3">
                          {locked ? <Lock className="h-4 w-4 text-muted-foreground" /> : <PlayCircle className="h-4 w-4 text-primary" />}
                          <div>
                            <div className="font-semibold">
                              Section {index + 1}: {section.title || "Untitled"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {section.lessons.length} lessons
                              {section.isFree ? " · Free preview" : " · Paid"}
                            </div>
                          </div>
                        </div>
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {isOpen && (
                        <div className="border-t border-border">
                          {section.lessons.map((lesson) => {
                            const canPreview = !locked || lesson.isPreviewable || section.isFree;
                            return (
                              <div key={lesson.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                                <div className="flex items-center gap-3">
                                  {lesson.type === "video" ? (
                                    <PlayCircle className="h-4 w-4 text-muted-foreground" />
                                  ) : lesson.type === "resource" ? (
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ScrollText className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span>{lesson.title || "Untitled lesson"}</span>
                                </div>
                                {canPreview ? (
                                  <Link href={`/lesson/${lesson.id}`} className="font-medium text-primary">
                                    {course.isOwned ? "Open" : "Preview"}
                                  </Link>
                                ) : (
                                  <Lock className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            );
                          })}
                          {section.assignments.map((a) => (
                            <div key={a.id} className="flex items-center gap-3 px-5 py-3 text-sm text-muted-foreground">
                              <ClipboardCheck className="h-4 w-4" /> Assignment: {a.title || "Untitled"}
                            </div>
                          ))}
                          {section.projects.map((p) => (
                            <div key={p.id} className="flex items-center gap-3 px-5 py-3 text-sm text-muted-foreground">
                              <FolderGit2 className="h-4 w-4" /> Project: {p.title || "Untitled"}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Reviews */}
            <section>
              <h2 className="font-display text-2xl font-bold">
                Reviews {course.reviewCount > 0 && <span className="text-muted-foreground">· {course.averageRating} ★ ({course.reviewCount})</span>}
              </h2>

              {course.isOwned && (
                <div className="mt-4 rounded-2xl border border-border bg-card p-5">
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
                    <div key={review.id} className="rounded-2xl border border-border bg-card p-4">
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
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-display text-lg font-bold">This course includes</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>{totalLessons} lessons across {course.sections.length} sections</li>
                <li>Video, reading, and resource lessons</li>
                <li>Assignments &amp; projects</li>
                {course.certificateEnabled && <li>Certificate of completion</li>}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
