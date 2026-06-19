# Admin System Developer Quick-Start Guide

## Installation & Setup

### 1. Import the Admin Hook
```typescript
import { useAdmin } from '@/lib/use-admin';

export default function MyAdminPage() {
  const { can, logAction, analytics } = useAdmin();
  
  // Component logic
}
```

### 2. Check Permissions
```typescript
// Single permission check
if (can('courses:approve')) {
  // Show approve button
}

// Multiple permissions
const { hasAll, hasAny } = useAdminPermissions([
  'courses:approve',
  'courses:decline'
]);

if (hasAny) {
  // Can do at least one
}
```

### 3. Log Actions
```typescript
// Log an action
await logAction(
  'course.approve',          // action type
  'course',                   // resource type
  courseId,                   // resource ID
  courseTitle,                // resource name
  { note: 'Good content' },   // metadata
  {                           // changes
    status: { before: 'pending', after: 'approved' }
  }
);
```

### 4. Handle Real-Time Events
```typescript
// Subscribe to events
useRealtimeEvent('course.approved', (event) => {
  console.log('Course approved:', event.data.courseId);
  // Refresh UI
});

// Auto-refresh data
const { refresh, isRefreshing } = useAdminAutoRefresh(
  'dashboard',
  'courses',
  30000 // 30 seconds
);
```

---

## Common Patterns

### Pattern 1: Permission-Gated Button
```typescript
import { useAdminPermission } from '@/lib/use-admin';

export function ApproveButton({ courseId }: { courseId: string }) {
  const { can } = useAdminPermission('courses:approve');
  
  if (!can) {
    return null; // Hide button if no permission
  }
  
  return (
    <Button onClick={() => handleApprove(courseId)}>
      Approve
    </Button>
  );
}
```

### Pattern 2: Audit-Logged Action
```typescript
const handleApprove = useCallback(async (courseId: string) => {
  try {
    // Perform action
    await api.approveCourse(courseId);
    
    // Log the action
    await logAction(
      'course.approve',
      'course',
      courseId,
      course.title
    );
    
    notifySuccess('Course approved');
  } catch (error) {
    notifyError(error.message);
  }
}, [logAction]);
```

### Pattern 3: Real-Time Data with Auto-Refresh
```typescript
const [courses, setCourses] = useState<Course[]>([]);

// Set up auto-refresh
useAdminAutoRefresh('courses', 'list', 45000);

// Subscribe to course events
useRealtimeEvent('course.approved', (event) => {
  setCourses(prev => 
    prev.map(c => 
      c.id === event.data.courseId 
        ? { ...c, status: 'approved' }
        : c
    )
  );
});

useEffect(() => {
  // Initial load
  fetchCourses();
}, []);
```

### Pattern 4: Bulk Operations
```typescript
import { bulkSuspendStudents } from '@/lib/bulk-operations';

const [selectedIds, setSelectedIds] = useState<string[]>([]);

const handleBulkSuspend = async () => {
  const operation = await bulkSuspendStudents(
    selectedIds,
    user.id,
    user.email
  );
  
  // Monitor progress
  const unsubscribe = subscribeToEvent('bulk-operation.progress', (event) => {
    if (event.data.operationId === operation.id) {
      setProgress(event.data.progress);
    }
  });
};
```

### Pattern 5: Analytics Display
```typescript
const MyAnalyticsDashboard = () => {
  const { analytics, refreshAdminAnalytics, isLoading } = useAdmin();
  
  return (
    <>
      <Button onClick={refreshAdminAnalytics} disabled={isLoading}>
        Refresh
      </Button>
      
      {analytics?.staleDataWarning && (
        <Alert severity="warning">
          Data is {getTimeSinceLastRefresh()}ms old
        </Alert>
      )}
      
      <CourseMetrics courses={analytics?.courseAnalytics} />
      <RevenueChart data={analytics?.revenueMetrics} />
    </>
  );
};
```

### Pattern 6: Permission-Based Form Fields
```typescript
const { permissions } = useAdminPermissions([
  'courses:create',
  'courses:edit'
]);

return (
  <form>
    <Input
      label="Course Title"
      disabled={!permissions['courses:edit']}
    />
    
    <Select
      label="Teacher"
      disabled={!permissions['courses:create']}
    />
    
    <Button disabled={!permissions['courses:create']}>
      Create
    </Button>
  </form>
);
```

---

## Common Tasks

### Creating an Audit Log Entry
```typescript
import { createAuditLog } from '@/lib/admin-audit';

createAuditLog(
  user.id,
  user.role,
  user.email,
  'teacher.create',           // action
  'teacher',                   // resourceType
  newTeacher.id,              // resourceId
  newTeacher.displayName,     // resourceName
  { program: 'Backend' },     // metadata
  {                           // changes
    status: { before: undefined, after: 'active' }
  },
  'success'                   // status
);
```

### Querying Audit Logs
```typescript
import { getAuditLogs } from '@/lib/admin-audit';

const logs = getAuditLogs({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  action: 'course.approve',
  status: 'success',
  limit: 50,
  offset: 0
});

// Export to CSV
const csv = exportAuditLogs({ action: 'course.approve' });
downloadAuditLogs({ action: 'course.approve' });
```

### Managing Support Tickets
```typescript
import {
  createSupportTicket,
  assignTicket,
  updateTicketStatus,
  addTicketComment,
  getSupportTicketStats
} from '@/lib/support-tickets';

// Create ticket
const ticket = createSupportTicket({
  title: 'Course upload failed',
  description: 'Cannot upload PDF materials',
  category: 'course-issue',
  priority: 'high',
  createdBy: userId,
  createdByEmail: userEmail,
  createdByRole: 'teacher'
});

// Assign
assignTicket(ticket.id, adminId, adminEmail);

// Add note
addTicketComment(
  ticket.id,
  adminName,
  adminEmail,
  'admin',
  'Please try again with smaller file',
  false // public comment
);

// Update status
updateTicketStatus(ticket.id, 'resolved');

// Get stats
const stats = getSupportTicketStats();
console.log(`Resolution rate: ${stats.resolutionRate}%`);
```

### Creating Broadcasts
```typescript
import {
  createBroadcast,
  publishBroadcast,
  checkAndExpireBroadcasts,
  calculateBroadcastCountdown
} from '@/lib/broadcast-notifications';

// Create
const broadcast = createBroadcast({
  title: 'New course available',
  message: 'Check out our new Python course!',
  template: 'announcement',
  target: 'students',
  createdBy: adminId,
  createdByEmail: adminEmail,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
});

// Publish when ready
publishBroadcast(broadcast.id);

// Check for expirations
const expired = checkAndExpireBroadcasts();

// Show countdown
const countdown = calculateBroadcastCountdown(broadcast.expiresAt!);
if (!countdown.isExpired) {
  console.log(`${countdown.days}d ${countdown.hours}h left`);
}
```

### Course Workflow Transitions
```typescript
import {
  canTransitionTo,
  getValidNextStates,
  isEditable,
  getStatusColor
} from '@/lib/course-workflow';

// Check if transition allowed
if (canTransitionTo('draft', 'submitted', 'teacher')) {
  // Submit course
}

// Get available actions
const nextStates = getValidNextStates(course.status, user.role);

// Show edit button
if (isEditable(course.status)) {
  // Show edit form
}

// Visual indicators
const badgeColor = getStatusColor(course.status);
```

### Checking Course Workflow Status
```typescript
import { getWorkflowProgress, getWorkflowPhase } from '@/lib/course-workflow';

const course = {
  status: 'under-review' as const,
  // ...
};

// Show progress bar (0-100)
const progress = getWorkflowProgress(course.status); // 50

// Get phase for grouping
const phase = getWorkflowPhase(course.status); // 'review'
```

---

## Admin Settings Usage

### Update System Settings
```typescript
import {
  getSettings,
  updateSettings,
  getSecuritySettings,
  updateSecuritySettings
} from '@/lib/admin-settings';

// Get current settings
const settings = getSettings();

// Update
updateSettings({
  maintenanceMode: true,
  maintenanceMessage: 'Down for maintenance',
  coursesRequireApproval: true,
  autoApproveAfterDays: 7
});

// Security settings
const securitySettings = getSecuritySettings();
updateSecuritySettings({
  requireStrongPasswords: true,
  minimumPasswordLength: 10,
  sessionTimeoutMinutes: 30
});
```

### Manage Admin Users
```typescript
import {
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  getAdminUsers,
  validatePassword
} from '@/lib/admin-settings';

// Create user
const user = createAdminUser({
  email: 'admin@example.com',
  displayName: 'John Admin',
  role: 'admin'
});

// Update role
updateAdminUser(user.id, { role: 'super-admin' });

// Delete user
deleteAdminUser(user.id);

// List users
const admins = getAdminUsers('admin'); // By role
const allAdmins = getAdminUsers();

// Validate password
const validation = validatePassword(password);
if (!validation.valid) {
  validation.errors.forEach(err => console.error(err));
}
```

### Manage Roles and Permissions
```typescript
import {
  getRoleManagement,
  updateRolePermissions
} from '@/lib/admin-settings';

const roles = getRoleManagement();

// Update permissions for a role
updateRolePermissions('admin', [
  'courses:view',
  'courses:approve',
  'courses:decline',
  // ... all desired permissions
]);
```

---

## Analytics Usage

### Get Analytics Data
```typescript
import {
  refreshAnalytics,
  getAnalyticsSnapshot,
  getCourseMetrics,
  getTopTeachers,
  getTeacherRankings,
  generateAnalyticsReport,
  downloadAnalyticsReport,
  getTimeSinceLastRefresh,
  isCacheFresh
} from '@/lib/admin-analytics';

// Refresh (will cache for 5 minutes)
await refreshAnalytics();

// Get snapshot
const snapshot = getAnalyticsSnapshot();

// Course metrics
const courses = getCourseMetrics();

// Top teachers
const topTeachers = getTopTeachers(10);

// Rankings
const byRevenue = getTeacherRankings('revenue');
const byRating = getTeacherRankings('rating');

// Export
const csv = generateAnalyticsReport('csv');
const json = generateAnalyticsReport('json');

// Download
downloadAnalyticsReport('csv');
downloadAnalyticsReport('json');

// Check freshness
if (isCacheFresh()) {
  console.log('Using fresh data');
} else {
  console.log(`Data is ${getTimeSinceLastRefresh()}ms old`);
}
```

---

## Permission Strings Reference

### Course Permissions
- `courses:view` - View courses
- `courses:create` - Create courses
- `courses:edit` - Edit course details
- `courses:delete` - Delete courses
- `courses:approve` - Approve submitted courses
- `courses:decline` - Decline courses
- `courses:reassign` - Reassign course to teacher
- `courses:archive` - Archive courses
- `courses:restore` - Restore archived courses
- `courses:publish` - Publish courses
- `courses:unpublish` - Unpublish courses

### Student Permissions
- `students:view` - View students
- `students:edit` - Edit student info
- `students:delete` - Delete students
- `students:suspend` - Suspend single student
- `students:bulk-suspend` - Bulk suspend students

### Other Common Permissions
- `analytics:view` - Access analytics
- `analytics:export` - Export analytics data
- `activity-logs:view` - View activity logs
- `support:view` - View support tickets
- `support:assign` - Assign tickets
- `support:close` - Close tickets
- `admin-settings:view` - View settings
- `admin-settings:edit` - Modify settings

---

## Error Handling

### Try-Catch Pattern
```typescript
try {
  await api.approveCourse(courseId);
  notifySuccess('Course approved');
} catch (error) {
  const message = error instanceof Error 
    ? error.message 
    : 'Failed to approve course';
  notifyError(message);
  
  // Log for debugging
  createAuditLog(
    user.id, user.role, user.email,
    'course.approve', 'course', courseId, course.title,
    {}, {}, 'failed', message
  );
}
```

### Permission Denied Handling
```typescript
if (!can('courses:approve')) {
  notifyError('You don\'t have permission to approve courses');
  return;
}
```

---

## Testing Checklist

- [ ] Permission checks block unauthorized actions
- [ ] Audit logs capture all actions
- [ ] Real-time updates refresh data
- [ ] Course workflow transitions work correctly
- [ ] Support tickets save and update
- [ ] Broadcasts publish and expire
- [ ] Bulk operations process correctly
- [ ] Analytics data refreshes and caches
- [ ] Settings persist across sessions
- [ ] Error messages display clearly

---

## Debugging Tips

### Check Current Permissions
```typescript
const { adminRole } = useAdmin();
console.log('Role:', adminRole);

const { permissions } = useAdminPermissions(
  Object.keys(rolePermissionMap[adminRole])
);
console.log('Permissions:', permissions);
```

### Monitor Real-Time Events
```typescript
// Log all events
const handler = (event: RealtimeEvent) => {
  console.log('Event:', event.type, event.data);
};

useRealtimeEvent('course.submitted', handler);
useRealtimeEvent('ticket.assigned', handler);
```

### Check Analytics Freshness
```typescript
const stats = getPollingStats();
console.log('Active pollers:', stats.activePollers);
console.log('Last updates:', stats.lastUpdates);
```

### View Audit Logs
```typescript
const logs = getAuditLogs({
  limit: 100,
  offset: 0
});
console.table(logs);
```

---

## Performance Best Practices

1. **Use Auto-Refresh Sparingly**
   - Only enable on pages that need live updates
   - Use appropriate intervals (not < 15s)

2. **Cache Analytics**
   - The system caches for 5 minutes
   - Don't call refreshAnalytics() in loops

3. **Batch Bulk Operations**
   - Use bulk endpoints for many items
   - Not in a loop

4. **Paginate Large Datasets**
   - Use offset/limit in audit log queries
   - Not loading all logs at once

5. **Debounce User Input**
   - Don't log every keystroke
   - Only log completed actions

---

## Support & Questions

For issues or questions:
1. Check this guide
2. Review the code comments in the library files
3. Look at the architecture document
4. Check the main refactoring document for details

---

**Last Updated**: 2024
**Version**: 2.0
**Status**: Production Ready
