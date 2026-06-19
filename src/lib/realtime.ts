/**
 * Real-Time System - Polling-based updates
 * Provides auto-refresh mechanisms for admin pages
 */

export type RealtimeEventType =
  | "course.submitted"
  | "course.approved"
  | "course.rejected"
  | "course.published"
  | "ticket.assigned"
  | "ticket.resolved"
  | "broadcast.sent"
  | "user.registered"
  | "payment.received"
  | "teacher.created"
  | "student.suspended"
  | "system.alert";

export interface RealtimeEvent {
  id: string;
  type: RealtimeEventType;
  timestamp: string;
  data: Record<string, unknown>;
  target?: string; // e.g., specific page or user
}

export interface AutoRefreshConfig {
  enabled: boolean;
  interval: number; // milliseconds
  page: string;
  dataKey: string;
}

const eventSubscribers: Map<RealtimeEventType, Set<(event: RealtimeEvent) => void>> = new Map();
const activePollers: Map<string, NodeJS.Timeout> = new Map();
const lastUpdateTimestamps: Map<string, number> = new Map();

export function subscribeToEvent(
  eventType: RealtimeEventType,
  callback: (event: RealtimeEvent) => void
): () => void {
  if (!eventSubscribers.has(eventType)) {
    eventSubscribers.set(eventType, new Set());
  }

  eventSubscribers.get(eventType)!.add(callback);

  // Return unsubscribe function
  return () => {
    eventSubscribers.get(eventType)?.delete(callback);
  };
}

export function emitEvent(event: RealtimeEvent): void {
  const subscribers = eventSubscribers.get(event.type);
  if (subscribers) {
    subscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error("Error in event subscriber:", error);
      }
    });
  }
}

export function startAutoRefresh(
  config: AutoRefreshConfig,
  refreshFn: () => Promise<void>
): () => void {
  const pollerId = `${config.page}-${config.dataKey}`;

  // Clear existing poller if any
  const existingPoller = activePollers.get(pollerId);
  if (existingPoller) {
    clearInterval(existingPoller);
  }

  if (!config.enabled || config.interval <= 0) {
    return () => {};
  }

  let isRefreshing = false;

  const poller = setInterval(async () => {
    if (isRefreshing) return;

    isRefreshing = true;
    try {
      await refreshFn();
      lastUpdateTimestamps.set(pollerId, Date.now());
    } catch (error) {
      console.error("Error during auto-refresh:", error);
    } finally {
      isRefreshing = false;
    }
  }, config.interval);

  activePollers.set(pollerId, poller);

  // Return cleanup function
  return () => {
    clearInterval(poller);
    activePollers.delete(pollerId);
  };
}

export function stopAutoRefresh(page: string, dataKey: string): void {
  const pollerId = `${page}-${dataKey}`;
  const poller = activePollers.get(pollerId);
  if (poller) {
    clearInterval(poller);
    activePollers.delete(pollerId);
  }
}

export function getLastUpdateTime(page: string, dataKey: string): number | null {
  const pollerId = `${page}-${dataKey}`;
  return lastUpdateTimestamps.get(pollerId) ?? null;
}

export function formatTimeSinceUpdate(timestamp: number | null): string {
  if (!timestamp) return "Never";

  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "seconds ago";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

  return `${Math.floor(seconds / 86400)}d ago`;
}

export const REFRESH_INTERVALS = {
  dashboard: 30000, // 30 seconds
  courses: 45000, // 45 seconds
  tickets: 20000, // 20 seconds
  broadcasts: 60000, // 1 minute
  notifications: 15000, // 15 seconds
  analytics: 120000, // 2 minutes
  default: 60000, // 1 minute
} as const;

export function getRefreshInterval(page: string): number {
  return REFRESH_INTERVALS[page as keyof typeof REFRESH_INTERVALS] ?? REFRESH_INTERVALS.default;
}

export function shouldAutoRefresh(page: string): boolean {
  const autoRefreshPages = [
    "dashboard",
    "courses",
    "tickets",
    "broadcasts",
    "notifications",
    "analytics",
  ];
  return autoRefreshPages.includes(page);
}

// Polling state management
const pollingState: Map<string, { lastCheck: number; isFresh: boolean }> = new Map();

export function markDataAsFresh(dataKey: string): void {
  pollingState.set(dataKey, {
    lastCheck: Date.now(),
    isFresh: true,
  });
}

export function markDataAsStale(dataKey: string): void {
  pollingState.set(dataKey, {
    lastCheck: Date.now(),
    isFresh: false,
  });
}

export function isDataFresh(dataKey: string, maxAge: number = 60000): boolean {
  const state = pollingState.get(dataKey);
  if (!state) return false;
  return state.isFresh && Date.now() - state.lastCheck < maxAge;
}

export function getPollingStats(): {
  activePollers: number;
  subscribers: number;
  lastUpdates: Record<string, string>;
} {
  const lastUpdates: Record<string, string> = {};

  lastUpdateTimestamps.forEach((timestamp, key) => {
    lastUpdates[key] = formatTimeSinceUpdate(timestamp);
  });

  return {
    activePollers: activePollers.size,
    subscribers: Array.from(eventSubscribers.values()).reduce(
      (sum, set) => sum + set.size,
      0
    ),
    lastUpdates,
  };
}

export function cleanup(): void {
  // Clear all active pollers
  activePollers.forEach((poller) => {
    clearInterval(poller);
  });
  activePollers.clear();

  // Clear subscribers
  eventSubscribers.clear();

  // Clear timestamps
  lastUpdateTimestamps.clear();

  // Clear polling state
  pollingState.clear();
}
