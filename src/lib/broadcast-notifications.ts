/**
 * Broadcast Notification System
 * System-wide broadcasts with targeting, scheduling, and expiry tracking
 */

export type BroadcastTarget = "all" | "students" | "teachers" | "specific-users" | "specific-roles" | "specific-courses";
export type BroadcastStatus = "draft" | "scheduled" | "active" | "expired" | "archived";
export type NotificationTemplate = "announcement" | "alert" | "reminder" | "promotion" | "warning" | "info";

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  template: NotificationTemplate;
  target: BroadcastTarget;
  targetUsers?: string[]; // user IDs
  targetRoles?: ("teacher" | "student" | "admin")[];
  targetCourses?: string[]; // course IDs
  status: BroadcastStatus;
  createdBy: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  expiresAt?: string;
  readCount?: number;
  totalTargeted?: number;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
  actionLabel?: string;
}

export interface BroadcastRead {
  id: string;
  broadcastId: string;
  userId: string;
  readAt: string;
}

export interface BroadcastTemplate {
  id: string;
  name: string;
  subject: string;
  template: NotificationTemplate;
  messageTemplate: string;
  variables: string[]; // e.g., [{{userName}}, {{courseName}}]
  createdAt: string;
  updatedAt: string;
}

export interface BroadcastStats {
  totalBroadcasts: number;
  activeBroadcasts: number;
  expiredBroadcasts: number;
  totalReads: number;
  avgReadRate: number;
  upcomingBroadcasts: number;
}

const broadcasts: Broadcast[] = [];
const broadcastReads: BroadcastRead[] = [];
const notificationTemplates: BroadcastTemplate[] = [];

// Default templates
const defaultTemplates: BroadcastTemplate[] = [
  {
    id: "announcement",
    name: "Announcement",
    subject: "New Announcement",
    template: "announcement",
    messageTemplate: "{{message}}",
    variables: ["message"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "alert",
    name: "System Alert",
    subject: "System Alert",
    template: "alert",
    messageTemplate: "⚠️ {{message}}",
    variables: ["message"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "reminder",
    name: "Reminder",
    subject: "Reminder",
    template: "reminder",
    messageTemplate: "📌 {{message}}",
    variables: ["message"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "promotion",
    name: "Promotion",
    subject: "Special Offer",
    template: "promotion",
    messageTemplate: "🎉 {{message}}",
    variables: ["message"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

notificationTemplates.push(...defaultTemplates);

export function createBroadcast(input: {
  title: string;
  message: string;
  template: NotificationTemplate;
  target: BroadcastTarget;
  targetUsers?: string[];
  targetRoles?: ("teacher" | "student" | "admin")[];
  targetCourses?: string[];
  createdBy: string;
  createdByEmail: string;
  scheduledAt?: string;
  expiresAt?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}): Broadcast {
  const broadcast: Broadcast = {
    id: `broadcast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: input.title,
    message: input.message,
    template: input.template,
    target: input.target,
    targetUsers: input.targetUsers,
    targetRoles: input.targetRoles,
    targetCourses: input.targetCourses,
    createdBy: input.createdBy,
    createdByEmail: input.createdByEmail,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scheduledAt: input.scheduledAt,
    expiresAt: input.expiresAt,
    status: input.scheduledAt ? "scheduled" : "draft",
    readCount: 0,
    metadata: input.metadata,
    actionUrl: input.actionUrl,
    actionLabel: input.actionLabel,
  };

  broadcasts.push(broadcast);
  void persistBroadcast(broadcast);

  return broadcast;
}

export function publishBroadcast(broadcastId: string): Broadcast | null {
  const broadcast = broadcasts.find((b) => b.id === broadcastId);
  if (!broadcast) return null;

  broadcast.status = "active";
  broadcast.updatedAt = new Date().toISOString();

  void persistBroadcast(broadcast);

  return broadcast;
}

export function markBroadcastRead(
  broadcastId: string,
  userId: string
): BroadcastRead {
  const read: BroadcastRead = {
    id: `read-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    broadcastId,
    userId,
    readAt: new Date().toISOString(),
  };

  broadcastReads.push(read);

  // Update read count
  const broadcast = broadcasts.find((b) => b.id === broadcastId);
  if (broadcast) {
    broadcast.readCount = (broadcast.readCount ?? 0) + 1;
  }

  return read;
}

export function getBroadcastReadRate(broadcastId: string): number {
  const broadcast = broadcasts.find((b) => b.id === broadcastId);
  if (!broadcast || !broadcast.totalTargeted || broadcast.totalTargeted === 0) {
    return 0;
  }

  const readCount = broadcast.readCount ?? 0;
  return (readCount / broadcast.totalTargeted) * 100;
}

export function checkAndExpireBroadcasts(): Broadcast[] {
  const now = new Date().toISOString();
  const expired: Broadcast[] = [];

  broadcasts.forEach((broadcast) => {
    if (
      broadcast.status === "active" &&
      broadcast.expiresAt &&
      broadcast.expiresAt <= now
    ) {
      broadcast.status = "expired";
      broadcast.updatedAt = now;
      expired.push(broadcast);
    }
  });

  if (expired.length > 0) {
    void persistExpiredBroadcasts(expired);
  }

  return expired;
}

export function getBroadcasts(filter?: {
  status?: BroadcastStatus;
  target?: BroadcastTarget;
  createdBy?: string;
}): Broadcast[] {
  let filtered = [...broadcasts];

  if (filter?.status) {
    filtered = filtered.filter((b) => b.status === filter.status);
  }
  if (filter?.target) {
    filtered = filtered.filter((b) => b.target === filter.target);
  }
  if (filter?.createdBy) {
    filtered = filtered.filter((b) => b.createdBy === filter.createdBy);
  }

  // Check for expired broadcasts
  checkAndExpireBroadcasts();

  // Sort by creation time (newest first)
  return filtered.sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeB - timeA;
  });
}

export function getBroadcastStats(): BroadcastStats {
  const activeBroadcasts = broadcasts.filter((b) => b.status === "active").length;
  const expiredBroadcasts = broadcasts.filter((b) => b.status === "expired").length;
  const upcomingBroadcasts = broadcasts.filter((b) => b.status === "scheduled").length;

  const totalReads = broadcastReads.length;

  const broadcastsWithReads = broadcasts.filter((b) => (b.readCount ?? 0) > 0);
  const avgReadRate =
    broadcastsWithReads.length > 0
      ? broadcastsWithReads.reduce((sum, b) => sum + getBroadcastReadRate(b.id), 0) /
        broadcastsWithReads.length
      : 0;

  return {
    totalBroadcasts: broadcasts.length,
    activeBroadcasts,
    expiredBroadcasts,
    totalReads,
    avgReadRate: Math.round(avgReadRate),
    upcomingBroadcasts,
  };
}

export function getNotificationTemplates(): BroadcastTemplate[] {
  return [...notificationTemplates];
}

export function createNotificationTemplate(
  input: Omit<BroadcastTemplate, "id" | "createdAt" | "updatedAt">
): BroadcastTemplate {
  const template: BroadcastTemplate = {
    ...input,
    id: `template-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  notificationTemplates.push(template);

  return template;
}

export function updateNotificationTemplate(
  templateId: string,
  updates: Partial<Omit<BroadcastTemplate, "id" | "createdAt">>
): BroadcastTemplate | null {
  const template = notificationTemplates.find((t) => t.id === templateId);
  if (!template) return null;

  Object.assign(template, { ...updates, updatedAt: new Date().toISOString() });

  return template;
}

export function deleteNotificationTemplate(templateId: string): boolean {
  const index = notificationTemplates.findIndex((t) => t.id === templateId);
  if (index === -1) return false;

  notificationTemplates.splice(index, 1);
  return true;
}

async function persistBroadcast(broadcast: Broadcast): Promise<void> {
  try {
    const response = await fetch("/api/admin/broadcasts/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(broadcast),
    });
    if (!response.ok) {
      console.error("Failed to persist broadcast:", response.statusText);
    }
  } catch (error) {
    console.error("Error persisting broadcast:", error);
  }
}

async function persistExpiredBroadcasts(broadcasts: Broadcast[]): Promise<void> {
  try {
    const response = await fetch("/api/admin/broadcasts/update-status/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ broadcasts }),
    });
    if (!response.ok) {
      console.error("Failed to persist broadcast expirations:", response.statusText);
    }
  } catch (error) {
    console.error("Error persisting broadcast expirations:", error);
  }
}

export function calculateBroadcastCountdown(expiresAt: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
} {
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isExpired: false };
}
