import type { Metadata } from "next";

import { CourseDetailView } from "./CourseDetailView";
import { fetchCourseForPreview } from "./preview-data";

/**
 * A server shell around the course page, purely so a shared link says what it
 * points at.
 *
 * The page itself is a client component — it has to be, it is full of state —
 * and a client component cannot export metadata. So WhatsApp, LinkedIn and
 * Google all saw the same generic card for every course on the platform.
 * Sharing a course was indistinguishable from sharing the home page, which is
 * a problem when the whole launch campaign is people sharing courses.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const course = await fetchCourseForPreview(id);

  if (!course) {
    // An unknown id still renders; the page itself says so. No point inventing
    // a title for it.
    return { title: "Course" };
  }

  const teacher = course.teacherName ? ` Taught by ${course.teacherName}.` : "";
  const description =
    course.summary?.slice(0, 180) ||
    `Learn ${course.title} on MooreSkillUp.${teacher} Certificates employers can check.`;

  return {
    title: course.title,
    description,
    openGraph: {
      type: "article",
      title: `${course.title} | MooreSkillUp`,
      description,
      url: `/course/${id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${course.title} | MooreSkillUp`,
      description,
    },
  };
}

export default function CoursePage() {
  return <CourseDetailView />;
}
