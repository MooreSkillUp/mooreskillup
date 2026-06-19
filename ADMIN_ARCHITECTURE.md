# Admin System Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ADMIN PAGES (15 Total)                          │
│  Dashboard | Teachers | Students | Courses | Notifications | etc.   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────────┐
        │      UNIFIED ADMIN INTEGRATION            │
        │         (use-admin.ts Hook)               │
        │  - Permissions checking                   │
        │  - Audit logging                          │
        │  - Analytics & settings                   │
        │  - Real-time events                       │
        └──────────┬───────────────────────────────┘
                   │
        ┌──────────┼──────────┬──────────┬──────────┬────────┐
        │          │          │          │          │        │
        ▼          ▼          ▼          ▼          ▼        ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌─────┐ ┌─────┐
    │ RBAC   │ │ Audit  │ │ Course │ │ Real-  │ │ Ana │ │ Set │
    │ System │ │ Logs   │ │Workflow│ │ time   │ │lytics│ │ings │
    │        │ │        │ │        │ │        │ │     │ │     │
    └────────┘ └────────┘ └────────┘ └────────┘ └─────┘ └─────┘
        │          │          │          │          │        │
        └──────────┼──────────┼──────────┼──────────┼────────┘
                   │
        ┌──────────┼───────────────────────────────┐
        │          │                               │
        ▼          ▼                               ▼
    ┌────────────────────┐        ┌─────────────────────┐
    │ Support Tickets    │        │   Broadcasts        │
    │                    │        │                     │
    │ - Status flow      │        │ - Scheduling        │
    │ - Priority levels  │        │ - Targeting         │
    │ - Assignment       │        │ - Expiry tracking   │
    │ - Comments         │        │ - Read tracking     │
    └────────────────────┘        └─────────────────────┘
        │
        └────────────┬──────────────────────────────┐
                     │                              │
                     ▼                              ▼
            ┌──────────────────┐        ┌─────────────────────┐
            │  Bulk Operations │        │ Authentication API  │
            │                  │        │                     │
            │ - Progress track │        │ - User roles        │
            │ - Error handling │        │ - Permissions       │
            │ - CSV export     │        │ - Session mgmt      │
            └──────────────────┘        └─────────────────────┘
                     │                              │
                     └──────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
            ┌──────────────────┐        ┌─────────────────────┐
            │  FRONTEND CACHE  │        │  BACKEND API        │
            │  (LocalStorage)  │        │  (Django/FastAPI)   │
            │                  │        │                     │
            │ - Settings       │        │ - Persist all data  │
            │ - Analytics      │        │ - Handle logic      │
            │ - User data      │        │ - Serve APIs        │
            └──────────────────┘        └─────────────────────┘
                                                   │
                                                   ▼
                                        ┌─────────────────────┐
                                        │  DATABASE           │
                                        │  (PostgreSQL/MySQL) │
                                        │                     │
                                        │ - Audit logs        │
                                        │ - Tickets           │
                                        │ - Broadcasts        │
                                        │ - Settings          │
                                        │ - Admin users       │
                                        │ - Bulk operations   │
                                        └─────────────────────┘
```

## Data Flow Diagrams

### 1. Permission Check Flow
```
User Action
    │
    ▼
useAdmin Hook
    │
    ├─ Check admin role
    │
    ├─ Call can(action)
    │
    ├─ Look up role in rolePermissionMap
    │
    ├─ Check if action in permissions
    │
    ▼
Render UI / Execute Action / Show Error
```

### 2. Audit Logging Flow
```
Admin Action
    │
    ▼
createAuditLog()
    │
    ├─ Create log object
    │
    ├─ Add to in-memory cache
    │
    ├─ persistAuditLog() → Backend API
    │
    │  (parallel)
    │
    ▼ (Frontend display)
Activity Feed / Audit Trail
```

### 3. Course Workflow Flow
```
Initial State (Draft)
    │
    ├─ Teacher submits → Submitted
    │                      │
    │                      ├─ Admin assigns reviewer → Under Review
    │                      │                            │
    │                      │                      ├─ Approve → Approved
    │                      │                      │              │
    │                      │                      │              ├─ Publish → Published
    │                      │                      │              │             │
    │                      │                      │              │             └─ Archive
    │                      │                      │
    │                      │                      └─ Reject → Rejected
    │                      │                         │
    │                      └─ Teacher revises ───────┘
    │
    └─ Admin publishes directly → Published
```

### 4. Real-Time Update Flow
```
Start Page
    │
    ▼
useAdmin Hook initializes
    │
    ├─ startAutoRefresh()
    │     │
    │     └─ setInterval(refreshFn, interval)
    │
    └─ subscribeToEvent()
          │
          └─ Listener for realtime events
                │
                ├─ Event emitted → Call callback
                │
                ├─ Update UI state
                │
                └─ Show "Updated X seconds ago"
```

### 5. Bulk Operation Flow
```
Initiate Bulk Operation
    │
    ├─ Select items: student1, student2, student3
    │
    ├─ initiateBulkOperation()
    │     │
    │     └─ Create operation with status: pending
    │
    ▼
Execute in Background
    │
    ├─ Loop through each item
    │     │
    │     ├─ Try operation
    │     │
    │     ├─ Update progress (0-100%)
    │     │
    │     ├─ Track success/failure
    │     │
    │     └─ Log errors per item
    │
    ▼
completeBulkOperation()
    │
    ├─ Set status: completed or partially-completed
    │
    └─ Return results to user
```

## Component Dependencies

```
useAdmin()
├── useAuth() - Get current user
├── hasPermission() - Check RBAC
├── createAuditLog() - Log actions
├── subscribeToEvent() - Real-time
├── refreshAnalytics() - Get metrics
├── getSettings() - Get config
└── startAutoRefresh() - Auto-refresh

useAdminPermission(action)
├── useAdmin()
└── can(action)

useAdminPermissions(actions[])
├── useAdmin()
└── can(action) × N

useAuditLog()
├── useAdmin()
└── logAction()

useRealtimeEvent(type, callback)
├── useAdmin()
└── subscribeToRealtimeEvent()

useAdminAutoRefresh(page, key, interval)
├── useAdmin()
└── refreshAdminAnalytics()
```

## State Management Flow

```
┌─────────────────────────────────────────┐
│  Component State (useState)              │
│                                         │
│ - Form inputs                           │
│ - UI visibility (dialogs, etc.)         │
│ - Local filters/sorting                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Admin Hook State (useAdmin)            │
│                                         │
│ - adminRole, can/cannot                 │
│ - analytics snapshot                    │
│ - settings                              │
│ - loading, error states                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Frontend Cache (LocalStorage)          │
│                                         │
│ - Analytics cache (5 min)               │
│ - Settings cache                        │
│ - UI preferences                        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Backend State (Database)               │
│                                         │
│ - Authoritative data                    │
│ - Audit logs                            │
│ - All persistent data                   │
└─────────────────────────────────────────┘
```

## Error Handling Strategy

```
Error Occurs
    │
    ▼
Try/Catch Block
    │
    ├─ Log to audit system (if critical)
    │
    ├─ Extract error message
    │
    ├─ Show notification to user (useFeedback)
    │
    └─ Update component error state
         │
         ▼
    Graceful Fallback UI
         │
         ├─ Disable affected buttons
         │
         ├─ Show error message
         │
         ├─ Suggest retry
         │
         └─ Allow user to continue
```

## Security Layers

```
Layer 1: Frontend Permission Checks
├─ useAdminPermission() hook
├─ can() / cannot() functions
└─ Permission-gated components

Layer 2: Audit Logging
├─ Log every action
├─ Track actor info
└─ Detect suspicious patterns

Layer 3: Backend Validation
├─ Verify permissions server-side
├─ Validate input data
└─ Check role capabilities

Layer 4: Database Constraints
├─ Foreign key constraints
├─ Unique constraints
└─ Check constraints
```

## Caching Strategy

```
Analytics Cache
├─ Duration: 5 minutes
├─ Refresh: Manual + Auto (if enabled)
├─ Stale check: Warn if > 5 min old
└─ Backend call: When expired

Settings Cache
├─ Duration: Session
├─ Refresh: On page load
├─ Update: Immediate after change
└─ Backend: Sync on update

User Permissions Cache
├─ Duration: Session
├─ Refresh: On login
├─ Update: If role changes
└─ Backend: Verify per request
```

## Performance Considerations

1. **Query Optimization**
   - Use indexes on timestamp, actor_id, action, status
   - Paginate large result sets
   - Limit auto-refresh to visible pages

2. **Caching**
   - 5-minute analytics cache
   - Session-level settings cache
   - LocalStorage for UI preferences

3. **Batch Operations**
   - Process in background with progress tracking
   - Chunk API calls to avoid timeouts
   - Retry failed items automatically

4. **Real-Time Updates**
   - Configurable intervals per page
   - Stop polling when page is hidden
   - Debounce rapid updates

5. **Code Splitting**
   - Load admin pages on-demand
   - Lazy load analytics components
   - Tree-shake unused permissions

---

This architecture ensures scalability, maintainability, and security while providing a smooth user experience for admin operations.
