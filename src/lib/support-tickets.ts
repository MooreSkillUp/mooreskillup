/**
 * Support Ticket System
 * Complete workflow: Open → In Progress → Resolved → Closed
 * Priority levels: low/medium/high/urgent
 */

export type SupportTicketStatus = "open" | "in-progress" | "resolved" | "closed" | "reopened";
export type SupportTicketPriority = "low" | "medium" | "high" | "urgent";
export type SupportTicketCategory =
  | "course-issue"
  | "payment-issue"
  | "account-issue"
  | "content-issue"
  | "technical-issue"
  | "other";

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  createdBy: string;
  createdByEmail: string;
  createdByRole: "teacher" | "student" | "admin";
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  assignedToEmail?: string;
  resolutionTime?: number; // milliseconds
  resolvedAt?: string;
  closedAt?: string;
}

export interface SupportTicketComment {
  id: string;
  ticketId: string;
  author: string;
  authorEmail: string;
  authorRole: "teacher" | "student" | "admin";
  message: string;
  isInternal: boolean; // Only visible to admins
  createdAt: string;
  updatedAt?: string;
}

export interface SupportTicketStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  avgResolutionTime: number; // milliseconds
  urgentTickets: number;
  overduedTickets: number;
  assignmentRate: number; // percentage
  resolutionRate: number; // percentage
  ticketsByCategory: Record<SupportTicketCategory, number>;
}

const supportTickets: SupportTicket[] = [];
const ticketComments: Map<string, SupportTicketComment[]> = new Map();

export function createSupportTicket(input: {
  title: string;
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  createdBy: string;
  createdByEmail: string;
  createdByRole: "teacher" | "student" | "admin";
}): SupportTicket {
  const ticket: SupportTicket = {
    id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: input.title,
    description: input.description,
    category: input.category,
    status: "open",
    priority: input.priority,
    createdBy: input.createdBy,
    createdByEmail: input.createdByEmail,
    createdByRole: input.createdByRole,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  supportTickets.push(ticket);
  void persistSupportTicket(ticket);

  return ticket;
}

export function assignTicket(
  ticketId: string,
  adminId: string,
  adminEmail: string
): SupportTicket | null {
  const ticket = supportTickets.find((t) => t.id === ticketId);
  if (!ticket) return null;

  ticket.assignedTo = adminId;
  ticket.assignedToEmail = adminEmail;
  ticket.status = "in-progress";
  ticket.updatedAt = new Date().toISOString();

  void persistSupportTicket(ticket);
  return ticket;
}

export function updateTicketStatus(
  ticketId: string,
  newStatus: SupportTicketStatus
): SupportTicket | null {
  const ticket = supportTickets.find((t) => t.id === ticketId);
  if (!ticket) return null;

  const oldStatus = ticket.status;
  ticket.status = newStatus;
  ticket.updatedAt = new Date().toISOString();

  if (newStatus === "resolved" && !ticket.resolvedAt) {
    ticket.resolvedAt = new Date().toISOString();
    if (ticket.createdAt) {
      ticket.resolutionTime =
        new Date(ticket.resolvedAt).getTime() -
        new Date(ticket.createdAt).getTime();
    }
  }

  if (newStatus === "closed" && !ticket.closedAt) {
    ticket.closedAt = new Date().toISOString();
  }

  if (newStatus === "reopened") {
    ticket.resolvedAt = undefined;
    ticket.closedAt = undefined;
    ticket.resolutionTime = undefined;
  }

  void persistSupportTicket(ticket);

  return ticket;
}

export function addTicketComment(
  ticketId: string,
  author: string,
  authorEmail: string,
  authorRole: "teacher" | "student" | "admin",
  message: string,
  isInternal: boolean = false
): SupportTicketComment | null {
  const ticket = supportTickets.find((t) => t.id === ticketId);
  if (!ticket) return null;

  const comment: SupportTicketComment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ticketId,
    author,
    authorEmail,
    authorRole,
    message,
    isInternal,
    createdAt: new Date().toISOString(),
  };

  if (!ticketComments.has(ticketId)) {
    ticketComments.set(ticketId, []);
  }
  ticketComments.get(ticketId)!.push(comment);

  ticket.updatedAt = new Date().toISOString();
  void persistSupportTicket(ticket);

  return comment;
}

export function getTicketComments(
  ticketId: string,
  userRole?: "admin" | "user"
): SupportTicketComment[] {
  const comments = ticketComments.get(ticketId) ?? [];

  // Hide internal comments from non-admin users
  if (userRole !== "admin") {
    return comments.filter((c) => !c.isInternal);
  }

  return comments;
}

export function getSupportTicketStats(): SupportTicketStats {
  const openTickets = supportTickets.filter((t) => t.status === "open");
  const inProgressTickets = supportTickets.filter((t) => t.status === "in-progress");
  const resolvedTickets = supportTickets.filter((t) => t.status === "resolved");
  const closedTickets = supportTickets.filter((t) => t.status === "closed");

  const urgentTickets = supportTickets.filter((t) => t.priority === "urgent").length;

  // Calculate average resolution time
  const resolutionTimes = supportTickets
    .filter((t) => t.resolutionTime)
    .map((t) => t.resolutionTime!);
  const avgResolutionTime =
    resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0;

  // Count overdue tickets (open or in-progress for more than 24 hours)
  const now = Date.now();
  const overduedTickets = [...openTickets, ...inProgressTickets].filter((t) => {
    const createdTime = new Date(t.createdAt).getTime();
    return now - createdTime > 24 * 60 * 60 * 1000;
  }).length;

  // Calculate assignment rate
  const assignedTickets = supportTickets.filter((t) => t.assignedTo).length;
  const assignmentRate = supportTickets.length > 0 ? (assignedTickets / supportTickets.length) * 100 : 0;

  // Calculate resolution rate
  const resolutionRate =
    supportTickets.length > 0
      ? ((resolvedTickets.length + closedTickets.length) / supportTickets.length) * 100
      : 0;

  // Count tickets by category
  const ticketsByCategory: Record<SupportTicketCategory, number> = {
    "course-issue": 0,
    "payment-issue": 0,
    "account-issue": 0,
    "content-issue": 0,
    "technical-issue": 0,
    other: 0,
  };

  supportTickets.forEach((ticket) => {
    ticketsByCategory[ticket.category]++;
  });

  return {
    totalTickets: supportTickets.length,
    openTickets: openTickets.length,
    inProgressTickets: inProgressTickets.length,
    resolvedTickets: resolvedTickets.length,
    closedTickets: closedTickets.length,
    avgResolutionTime,
    urgentTickets,
    overduedTickets,
    assignmentRate: Math.round(assignmentRate),
    resolutionRate: Math.round(resolutionRate),
    ticketsByCategory,
  };
}

async function persistSupportTicket(ticket: SupportTicket): Promise<void> {
  try {
    const response = await fetch("/api/admin/support-tickets/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ticket),
    });
    if (!response.ok) {
      console.error("Failed to persist support ticket:", response.statusText);
    }
  } catch (error) {
    console.error("Error persisting support ticket:", error);
  }
}

export function getSupportTickets(
  filter?: {
    status?: SupportTicketStatus;
    priority?: SupportTicketPriority;
    assignedTo?: string;
    category?: SupportTicketCategory;
  }
): SupportTicket[] {
  let filtered = [...supportTickets];

  if (filter?.status) {
    filtered = filtered.filter((t) => t.status === filter.status);
  }
  if (filter?.priority) {
    filtered = filtered.filter((t) => t.priority === filter.priority);
  }
  if (filter?.assignedTo) {
    filtered = filtered.filter((t) => t.assignedTo === filter.assignedTo);
  }
  if (filter?.category) {
    filtered = filtered.filter((t) => t.category === filter.category);
  }

  // Sort by priority and creation time
  return filtered.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff =
      priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    return (
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });
}
