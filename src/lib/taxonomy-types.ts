/**
 * Shared domain types and taxonomy fallbacks.
 *
 * The live taxonomy comes from `/api/categories/` via `usePlatformTaxonomy`
 * in `taxonomy.ts`. The constants below are only a last-resort fallback for
 * forms that must still render a sensible choice when that request has not
 * resolved (or failed). They are named FALLBACK_* so nothing mistakes them
 * for the real category list.
 *
 * These types stay open (`| (string & {})`) because admins can create
 * categories and subcategories the frontend has never heard of.
 */

export type BaseInterest =
  | "Web Development"
  | "Backend Development"
  | "Graphics and Design"
  | "AI and Data"
  | "Engineering"
  | "Cloud and DevOps"
  | "Programming Languages";

export type Interest = BaseInterest | (string & {});

export type WebTrack =
  | "Frontend Development"
  | "Fullstack Foundations"
  | "React and Modern UI";

export type BackendTrack = "Backend with Python" | "Backend with JavaScript";

export type DesignTrack =
  | "UI/UX Design"
  | "Graphics Design"
  | "Video Editing"
  | "Figma Mastery";

export type DataTrack =
  | "Data Analysis"
  | "Artificial Intelligence"
  | "AI Automation";

export type EngineeringTrack =
  | "3D Modeling"
  | "SolidWorks"
  | "Engineering Design Systems";

export type CloudTrack =
  | "Cloud Foundations"
  | "DevOps Engineering"
  | "Cloud Automation";

export type LanguageTrack = "JavaScript" | "Python" | "TypeScript" | "SQL";

export type BaseTrackName =
  | WebTrack
  | BackendTrack
  | DesignTrack
  | DataTrack
  | EngineeringTrack
  | CloudTrack
  | LanguageTrack;

export type TrackName = BaseTrackName | (string & {});

export type UserPlan = "free" | "pro" | "premium";
export type UserRole = "student" | "admin" | "teacher";

export const FALLBACK_INTERESTS: BaseInterest[] = [
  "Web Development",
  "Backend Development",
  "Graphics and Design",
  "AI and Data",
  "Engineering",
  "Cloud and DevOps",
  "Programming Languages",
];

export const FALLBACK_TRACKS_BY_INTEREST: Record<BaseInterest, TrackName[]> = {
  "Web Development": [
    "Frontend Development",
    "Fullstack Foundations",
    "React and Modern UI",
  ],
  "Backend Development": ["Backend with Python", "Backend with JavaScript"],
  "Graphics and Design": [
    "UI/UX Design",
    "Graphics Design",
    "Video Editing",
    "Figma Mastery",
  ],
  "AI and Data": ["Data Analysis", "Artificial Intelligence", "AI Automation"],
  Engineering: ["3D Modeling", "SolidWorks", "Engineering Design Systems"],
  "Cloud and DevOps": [
    "Cloud Foundations",
    "DevOps Engineering",
    "Cloud Automation",
  ],
  "Programming Languages": ["JavaScript", "Python", "TypeScript", "SQL"],
};
