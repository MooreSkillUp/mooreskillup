import { serverApiUrl } from "@/lib/server-api";

/**
 * The little a link preview needs to know about a course.
 *
 * Fetched on the server, unauthenticated, because whoever is looking is a
 * scraper or a stranger who has not signed in. Kept separate from the page so
 * the metadata and the preview image read the same source and cannot disagree
 * about what a course is called.
 */
export interface CoursePreview {
  title: string;
  summary: string;
  teacherName: string;
  categoryName: string;
  price: number;
  lessonCount: number;
}

export async function fetchCourseForPreview(id: string): Promise<CoursePreview | null> {
  try {
    const response = await fetch(serverApiUrl(`/api/courses/${id}/`), {
      // Course titles and prices change, and a preview cached for a day would
      // show yesterday's price in a WhatsApp group. An hour is a fair trade
      // against hammering the API every time a link is pasted anywhere.
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    const raw = (await response.json()) as Record<string, unknown>;

    return {
      title: String(raw.title ?? "Course"),
      summary: String(raw.subtitle ?? raw.description ?? ""),
      teacherName: String(raw.teacherName ?? ""),
      categoryName: String(raw.categoryName ?? raw.program ?? ""),
      // The API sends price as a decimal string, so Number() rather than a cast.
      price: Number(raw.price ?? 0),
      lessonCount: Number(raw.totalLessons ?? 0),
    };
  } catch {
    // A preview is a nicety. It must never be the reason a page fails to open.
    return null;
  }
}
