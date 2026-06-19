/**
 * Bulk Operations System
 * Handle bulk actions: suspend/activate/delete users, approve courses, assign tickets, etc.
 */

export type BulkOperationType =
  | "suspend-students"
  | "activate-students"
  | "delete-students"
  | "delete-teachers"
  | "approve-courses"
  | "decline-courses"
  | "archive-courses"
  | "publish-courses"
  | "assign-tickets"
  | "close-tickets"
  | "send-notifications"
  | "export-data";

export interface BulkOperation {
  id: string;
  type: BulkOperationType;
  status: "pending" | "in-progress" | "completed" | "failed" | "partially-completed";
  initiatedBy: string;
  initiatedByEmail: string;
  initiatedAt: string;
  completedAt?: string;
  targetIds: string[];
  successCount: number;
  failureCount: number;
  errors: Array<{ id: string; error: string }>;
  metadata: Record<string, unknown>;
  progress: number; // 0-100
}

export interface BulkOperationResult {
  operation: BulkOperation;
  successful: string[];
  failed: Array<{ id: string; reason: string }>;
}

const bulkOperations: BulkOperation[] = [];

export function initiateBulkOperation(input: {
  type: BulkOperationType;
  targetIds: string[];
  initiatedBy: string;
  initiatedByEmail: string;
  metadata?: Record<string, unknown>;
}): BulkOperation {
  const operation: BulkOperation = {
    id: `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: input.type,
    status: "pending",
    initiatedBy: input.initiatedBy,
    initiatedByEmail: input.initiatedByEmail,
    initiatedAt: new Date().toISOString(),
    targetIds: input.targetIds,
    successCount: 0,
    failureCount: 0,
    errors: [],
    metadata: input.metadata ?? {},
    progress: 0,
  };

  bulkOperations.push(operation);
  void persistBulkOperation(operation);

  return operation;
}

export function updateBulkOperationProgress(
  operationId: string,
  progress: number,
  successCount: number,
  failureCount: number,
  errors: Array<{ id: string; error: string }> = []
): BulkOperation | null {
  const operation = bulkOperations.find((op) => op.id === operationId);
  if (!operation) return null;

  operation.progress = Math.min(100, progress);
  operation.successCount = successCount;
  operation.failureCount = failureCount;
  operation.errors = errors;
  operation.status =
    progress < 100 ? "in-progress" : "completed";

  if (operation.status === "completed" && !operation.completedAt) {
    operation.completedAt = new Date().toISOString();
  }

  void persistBulkOperation(operation);

  return operation;
}

export function completeBulkOperation(
  operationId: string,
  successCount: number,
  failureCount: number,
  errors: Array<{ id: string; error: string }> = []
): BulkOperation | null {
  const operation = bulkOperations.find((op) => op.id === operationId);
  if (!operation) return null;

  operation.status = failureCount === 0 ? "completed" : "partially-completed";
  operation.successCount = successCount;
  operation.failureCount = failureCount;
  operation.errors = errors;
  operation.progress = 100;
  operation.completedAt = new Date().toISOString();

  void persistBulkOperation(operation);

  return operation;
}

export function failBulkOperation(
  operationId: string,
  errorMessage: string
): BulkOperation | null {
  const operation = bulkOperations.find((op) => op.id === operationId);
  if (!operation) return null;

  operation.status = "failed";
  operation.completedAt = new Date().toISOString();
  operation.errors.push({
    id: "global",
    error: errorMessage,
  });

  void persistBulkOperation(operation);

  return operation;
}

export function getBulkOperations(filter?: {
  type?: BulkOperationType;
  status?: BulkOperation["status"];
  initiatedBy?: string;
  limit?: number;
}): BulkOperation[] {
  let filtered = [...bulkOperations];

  if (filter?.type) {
    filtered = filtered.filter((op) => op.type === filter.type);
  }
  if (filter?.status) {
    filtered = filtered.filter((op) => op.status === filter.status);
  }
  if (filter?.initiatedBy) {
    filtered = filtered.filter((op) => op.initiatedBy === filter.initiatedBy);
  }

  // Sort by initiated time (newest first)
  filtered.sort((a, b) => {
    const timeA = new Date(a.initiatedAt).getTime();
    const timeB = new Date(b.initiatedAt).getTime();
    return timeB - timeA;
  });

  if (filter?.limit) {
    filtered = filtered.slice(0, filter.limit);
  }

  return filtered;
}

export function getBulkOperationStats(): {
  totalOperations: number;
  pendingOperations: number;
  inProgressOperations: number;
  completedOperations: number;
  failedOperations: number;
  totalTargeted: number;
  totalSuccessful: number;
  totalFailed: number;
} {
  const pending = bulkOperations.filter((op) => op.status === "pending").length;
  const inProgress = bulkOperations.filter((op) => op.status === "in-progress").length;
  const completed = bulkOperations.filter((op) => op.status === "completed").length;
  const failed = bulkOperations.filter((op) => op.status === "failed").length;

  const totalTargeted = bulkOperations.reduce(
    (sum, op) => sum + op.targetIds.length,
    0
  );
  const totalSuccessful = bulkOperations.reduce(
    (sum, op) => sum + op.successCount,
    0
  );
  const totalFailed = bulkOperations.reduce(
    (sum, op) => sum + op.failureCount,
    0
  );

  return {
    totalOperations: bulkOperations.length,
    pendingOperations: pending,
    inProgressOperations: inProgress,
    completedOperations: completed,
    failedOperations: failed,
    totalTargeted,
    totalSuccessful,
    totalFailed,
  };
}

// Bulk operation implementations
export async function bulkSuspendStudents(
  studentIds: string[],
  initiatedBy: string,
  initiatedByEmail: string
): Promise<BulkOperation> {
  const operation = initiateBulkOperation({
    type: "suspend-students",
    targetIds: studentIds,
    initiatedBy,
    initiatedByEmail,
  });

  // Execute in background
  executeStudentSuspensionBulk(operation.id, studentIds);

  return operation;
}

export async function bulkApprooveCourses(
  courseIds: string[],
  initiatedBy: string,
  initiatedByEmail: string
): Promise<BulkOperation> {
  const operation = initiateBulkOperation({
    type: "approve-courses",
    targetIds: courseIds,
    initiatedBy,
    initiatedByEmail,
  });

  // Execute in background
  executeCoursesApproveBulk(operation.id, courseIds);

  return operation;
}

export async function bulkAssignTickets(
  ticketIds: string[],
  adminId: string,
  adminEmail: string,
  initiatedBy: string,
  initiatedByEmail: string
): Promise<BulkOperation> {
  const operation = initiateBulkOperation({
    type: "assign-tickets",
    targetIds: ticketIds,
    initiatedBy,
    initiatedByEmail,
    metadata: { assignedToId: adminId, assignedToEmail: adminEmail },
  });

  // Execute in background
  executeTicketAssignmentBulk(operation.id, ticketIds, adminId, adminEmail);

  return operation;
}

export async function bulkExportData(
  dataType: "students" | "teachers" | "courses" | "transactions",
  initiatedBy: string,
  initiatedByEmail: string
): Promise<BulkOperation> {
  const operation = initiateBulkOperation({
    type: "export-data",
    targetIds: [dataType],
    initiatedBy,
    initiatedByEmail,
    metadata: { dataType },
  });

  // Execute in background
  executeDataExport(operation.id, dataType);

  return operation;
}

// Background execution functions
async function executeStudentSuspensionBulk(
  operationId: string,
  studentIds: string[]
): Promise<void> {
  const operation = bulkOperations.find((op) => op.id === operationId);
  if (!operation) return;

  let successCount = 0;
  let failureCount = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (let i = 0; i < studentIds.length; i++) {
    const studentId = studentIds[i];
    try {
      const response = await fetch(
        `/api/admin/students/${studentId}/suspend/`,
        { method: "POST" }
      );

      if (response.ok) {
        successCount++;
      } else {
        failureCount++;
        errors.push({
          id: studentId,
          error: `Failed to suspend: ${response.statusText}`,
        });
      }
    } catch (error) {
      failureCount++;
      errors.push({
        id: studentId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    const progress = Math.floor(((i + 1) / studentIds.length) * 100);
    updateBulkOperationProgress(
      operationId,
      progress,
      successCount,
      failureCount,
      errors
    );
  }

  completeBulkOperation(operationId, successCount, failureCount, errors);
}

async function executeCoursesApproveBulk(
  operationId: string,
  courseIds: string[]
): Promise<void> {
  const operation = bulkOperations.find((op) => op.id === operationId);
  if (!operation) return;

  let successCount = 0;
  let failureCount = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (let i = 0; i < courseIds.length; i++) {
    const courseId = courseIds[i];
    try {
      const response = await fetch(
        `/api/admin/courses/${courseId}/approve/`,
        { method: "POST" }
      );

      if (response.ok) {
        successCount++;
      } else {
        failureCount++;
        errors.push({
          id: courseId,
          error: `Failed to approve: ${response.statusText}`,
        });
      }
    } catch (error) {
      failureCount++;
      errors.push({
        id: courseId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    const progress = Math.floor(((i + 1) / courseIds.length) * 100);
    updateBulkOperationProgress(
      operationId,
      progress,
      successCount,
      failureCount,
      errors
    );
  }

  completeBulkOperation(operationId, successCount, failureCount, errors);
}

async function executeTicketAssignmentBulk(
  operationId: string,
  ticketIds: string[],
  adminId: string,
  adminEmail: string
): Promise<void> {
  const operation = bulkOperations.find((op) => op.id === operationId);
  if (!operation) return;

  let successCount = 0;
  let failureCount = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (let i = 0; i < ticketIds.length; i++) {
    const ticketId = ticketIds[i];
    try {
      const response = await fetch(
        `/api/admin/support-tickets/${ticketId}/assign/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminId, adminEmail }),
        }
      );

      if (response.ok) {
        successCount++;
      } else {
        failureCount++;
        errors.push({
          id: ticketId,
          error: `Failed to assign: ${response.statusText}`,
        });
      }
    } catch (error) {
      failureCount++;
      errors.push({
        id: ticketId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    const progress = Math.floor(((i + 1) / ticketIds.length) * 100);
    updateBulkOperationProgress(
      operationId,
      progress,
      successCount,
      failureCount,
      errors
    );
  }

  completeBulkOperation(operationId, successCount, failureCount, errors);
}

async function executeDataExport(
  operationId: string,
  dataType: "students" | "teachers" | "courses" | "transactions"
): Promise<void> {
  const operation = bulkOperations.find((op) => op.id === operationId);
  if (!operation) return;

  try {
    updateBulkOperationProgress(operationId, 50, 0, 0);

    const response = await fetch(`/api/admin/export/${dataType}/`);

    if (response.ok) {
      const csvContent = await response.text();
      // Would trigger download in real scenario
      completeBulkOperation(operationId, 1, 0);
    } else {
      failBulkOperation(operationId, `Export failed: ${response.statusText}`);
    }
  } catch (error) {
    failBulkOperation(
      operationId,
      error instanceof Error ? error.message : "Export failed"
    );
  }
}

async function persistBulkOperation(operation: BulkOperation): Promise<void> {
  try {
    const response = await fetch("/api/admin/bulk-operations/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(operation),
    });
    if (!response.ok) {
      console.error("Failed to persist bulk operation:", response.statusText);
    }
  } catch (error) {
    console.error("Error persisting bulk operation:", error);
  }
}
