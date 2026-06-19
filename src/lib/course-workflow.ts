/**
 * Course Workflow System
 * Manages course states: Draft → Submitted → Under Review → Approved/Rejected → Published → Archived
 */

export type CourseStatus =
  | "draft"
  | "submitted"
  | "under-review"
  | "approved"
  | "rejected"
  | "published"
  | "archived";

export type CourseVisibility = "private" | "public" | "restricted";

export interface CourseWorkflowState {
  status: CourseStatus;
  submittedAt?: string;
  reviewStartedAt?: string;
  reviewCompletedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  publishedAt?: string;
  archivedAt?: string;
  rejectionReason?: string;
  reviewerNotes?: string;
  assignedReviewerId?: string;
  assignedReviewerEmail?: string;
}

export interface CourseApprovalRequest {
  id: string;
  courseId: string;
  courseTitle: string;
  teacherId: string;
  teacherName: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewerId?: string;
  reviewerEmail?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  reviewNotes?: string;
}

export interface CourseStatusTransition {
  from: CourseStatus;
  to: CourseStatus;
  allowedRoles: ("super-admin" | "admin" | "moderator" | "teacher")[];
  requiresReview?: boolean;
  description: string;
}

// Define allowed state transitions
export const courseStatusTransitions: CourseStatusTransition[] = [
  {
    from: "draft",
    to: "submitted",
    allowedRoles: ["teacher"],
    requiresReview: true,
    description: "Teacher submits course for review",
  },
  {
    from: "draft",
    to: "published",
    allowedRoles: ["super-admin", "admin"],
    requiresReview: false,
    description: "Admin directly publishes admin-owned course",
  },
  {
    from: "submitted",
    to: "under-review",
    allowedRoles: ["super-admin", "admin"],
    requiresReview: false,
    description: "Admin assigns course for review",
  },
  {
    from: "under-review",
    to: "approved",
    allowedRoles: ["super-admin", "admin", "moderator"],
    requiresReview: false,
    description: "Course approved by reviewer",
  },
  {
    from: "under-review",
    to: "rejected",
    allowedRoles: ["super-admin", "admin", "moderator"],
    requiresReview: false,
    description: "Course rejected with feedback",
  },
  {
    from: "rejected",
    to: "submitted",
    allowedRoles: ["teacher"],
    requiresReview: true,
    description: "Teacher resubmits after rejection",
  },
  {
    from: "approved",
    to: "published",
    allowedRoles: ["super-admin", "admin"],
    requiresReview: false,
    description: "Course published after approval",
  },
  {
    from: "published",
    to: "archived",
    allowedRoles: ["super-admin", "admin"],
    requiresReview: false,
    description: "Course archived",
  },
  {
    from: "archived",
    to: "published",
    allowedRoles: ["super-admin", "admin"],
    requiresReview: false,
    description: "Course restored from archive",
  },
  {
    from: "draft",
    to: "archived",
    allowedRoles: ["super-admin", "admin"],
    requiresReview: false,
    description: "Draft course archived",
  },
];

export function canTransitionTo(
  fromStatus: CourseStatus,
  toStatus: CourseStatus,
  userRole: "super-admin" | "admin" | "moderator" | "teacher"
): boolean {
  const transition = courseStatusTransitions.find(
    (t) => t.from === fromStatus && t.to === toStatus
  );

  if (!transition) return false;

  return transition.allowedRoles.includes(userRole);
}

export function getValidNextStates(
  currentStatus: CourseStatus,
  userRole: "super-admin" | "admin" | "moderator" | "teacher"
): CourseStatus[] {
  return courseStatusTransitions
    .filter(
      (t) =>
        t.from === currentStatus && t.allowedRoles.includes(userRole)
    )
    .map((t) => t.to);
}

export function getStateDescription(status: CourseStatus): string {
  const descriptions: Record<CourseStatus, string> = {
    draft: "Course is in draft mode, not visible to users",
    submitted: "Teacher submitted course for review",
    "under-review": "Course is under review by moderators",
    approved: "Course approved, ready to publish",
    rejected: "Course rejected with feedback",
    published: "Course is live and visible to users",
    archived: "Course is archived and not available",
  };
  return descriptions[status] ?? "Unknown status";
}

export function getStateColor(status: CourseStatus): string {
  const colors: Record<CourseStatus, string> = {
    draft: "bg-gray-100 text-gray-900",
    submitted: "bg-blue-100 text-blue-900",
    "under-review": "bg-yellow-100 text-yellow-900",
    approved: "bg-green-100 text-green-900",
    rejected: "bg-red-100 text-red-900",
    published: "bg-emerald-100 text-emerald-900",
    archived: "bg-slate-100 text-slate-900",
  };
  return colors[status] ?? "bg-gray-100 text-gray-900";
}

export function isPublished(status: CourseStatus): boolean {
  return status === "published";
}

export function isEditable(status: CourseStatus): boolean {
  return status === "draft" || status === "rejected";
}

export function canBePublished(status: CourseStatus): boolean {
  return status === "approved" || status === "draft" || status === "published";
}

export function getWorkflowProgress(status: CourseStatus): number {
  const progressMap: Record<CourseStatus, number> = {
    draft: 0,
    submitted: 25,
    "under-review": 50,
    approved: 75,
    rejected: 25,
    published: 100,
    archived: 100,
  };
  return progressMap[status] ?? 0;
}

export function getWorkflowPhase(
  status: CourseStatus
): "creation" | "submission" | "review" | "publishing" | "archived" {
  switch (status) {
    case "draft":
      return "creation";
    case "submitted":
    case "rejected":
      return "submission";
    case "under-review":
    case "approved":
      return "review";
    case "published":
      return "publishing";
    case "archived":
      return "archived";
  }
}

export function getStatusIcon(
  status: CourseStatus
): "pencil" | "send" | "clock" | "check" | "x" | "rocket" | "archive" {
  switch (status) {
    case "draft":
      return "pencil";
    case "submitted":
      return "send";
    case "under-review":
      return "clock";
    case "approved":
      return "check";
    case "rejected":
      return "x";
    case "published":
      return "rocket";
    case "archived":
      return "archive";
  }
}
