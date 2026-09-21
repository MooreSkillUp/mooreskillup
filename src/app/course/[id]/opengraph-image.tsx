import { ImageResponse } from "next/og";

import { fetchCourseForPreview } from "./preview-data";

/**
 * The picture someone sees when a course link lands in a WhatsApp group.
 *
 * Drawn per course rather than reusing the site image, because "MooreSkillUp"
 * on every card tells a reader nothing about the thing they were sent. The
 * course title is the message; everything else is there to make it legible.
 *
 * Next wires this file up by convention: being here sets og:image and its
 * dimensions on every /course/[id] page.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A MooreSkillUp course";

const NAVY = "#012E68";
const NAVY_DEEP = "#01214B";
const ORANGE = "#FC6203";

/**
 * A note on the markup: every text line is a single template string rather than
 * text mixed with an expression. Satori counts `Taught by {name}` as two
 * children and refuses any div with more than one unless it is explicitly flex,
 * which fails at render time rather than at build.
 */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await fetchCourseForPreview(id);
  const title = course?.title ?? "MooreSkillUp";
  const naira = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });

  const facts = [
    course?.categoryName,
    course?.lessonCount ? `${course.lessonCount} lessons` : "",
    // "NGN" rather than the ₦ sign: the font this renders with has no glyph for
    // it, and a price shown as a missing-character box is worse than plain.
    course ? (course.price > 0 ? `NGN ${naira.format(course.price)}` : "Free") : "",
  ].filter(Boolean);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`,
          borderBottom: `14px solid ${ORANGE}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: ORANGE,
              fontWeight: 700,
            }}
          >
            MooreSkillUp
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: title.length > 48 ? 62 : 78,
              lineHeight: 1.08,
              fontWeight: 800,
              color: "#FFFFFF",
              // Long titles are common and a clipped title reads as a bug.
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {course?.teacherName ? (
            <div style={{ fontSize: 30, color: "#C8D6EC" }}>{`Taught by ${course.teacherName}`}</div>
          ) : null}
          <div style={{ display: "flex", gap: 14 }}>
            {facts.map((fact) => (
              <div
                key={fact}
                style={{
                  display: "flex",
                  fontSize: 26,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  background: "rgba(255,255,255,0.14)",
                  padding: "10px 22px",
                  borderRadius: 999,
                }}
              >
                {fact}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
