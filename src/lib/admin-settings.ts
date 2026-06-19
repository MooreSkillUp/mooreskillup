/**
 * Admin Settings Module
 * System configuration, permission management, notification templates, and security settings
 */

import { type AdminRole, rolePermissionMap, type AdminResourceAction } from "./admin-rbac";

export interface AdminSettings {
  systemName: string;
  systemDescription: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  maxUploadSizeMB: number;
  coursesRequireApproval: boolean;
  autoApproveAfterDays?: number;
  defaultTimeoutMinutes: number;
  enableAuditLogging: boolean;
  auditLogRetentionDays: number;
  enableRealtimeUpdates: boolean;
  realtimeRefreshIntervalSeconds: number;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  permissions: AdminResourceAction[];
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  passwordChangedAt?: string;
}

export interface RoleManagement {
  role: AdminRole;
  displayName: string;
  description: string;
  permissions: AdminResourceAction[];
  userCount: number;
  isDefault: boolean;
  isSystemRole: boolean; // Can't be deleted
}

export interface SecuritySettings {
  requireStrongPasswords: boolean;
  minimumPasswordLength: number;
  requireNumbersInPassword: boolean;
  requireSpecialCharsInPassword: boolean;
  passwordExpiryDays?: number;
  enableTwoFactor: boolean;
  sessionTimeoutMinutes: number;
  maxFailedLoginAttempts: number;
  lockoutDurationMinutes: number;
  enableIpWhitelist: boolean;
  whitelistedIps: string[];
}

export interface NotificationSettings {
  enableEmailNotifications: boolean;
  enableInAppNotifications: boolean;
  enableSlackNotifications: boolean;
  slackWebhookUrl?: string;
  notificationBatchInterval: number; // seconds
  maxNotificationsPerBatch: number;
  unsubscribeUrl?: string;
}

export interface ApiIntegrationSettings {
  stripeLiveMode: boolean;
  stripePublicKey: string;
  googleAnalyticsId?: string;
  slackBotToken?: string;
  sendgridApiKey?: string;
  customDomain?: string;
  enableApiAccess: boolean;
  rateLimit: number; // requests per minute
}

let settings: AdminSettings = {
  systemName: "MooreSkillUp",
  systemDescription: "Learning platform for skill development",
  maintenanceMode: false,
  maxUploadSizeMB: 100,
  coursesRequireApproval: true,
  autoApproveAfterDays: 7,
  defaultTimeoutMinutes: 30,
  enableAuditLogging: true,
  auditLogRetentionDays: 365,
  enableRealtimeUpdates: true,
  realtimeRefreshIntervalSeconds: 30,
};

let securitySettings: SecuritySettings = {
  requireStrongPasswords: true,
  minimumPasswordLength: 8,
  requireNumbersInPassword: true,
  requireSpecialCharsInPassword: true,
  passwordExpiryDays: 90,
  enableTwoFactor: false,
  sessionTimeoutMinutes: 30,
  maxFailedLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  enableIpWhitelist: false,
  whitelistedIps: [],
};

let notificationSettings: NotificationSettings = {
  enableEmailNotifications: true,
  enableInAppNotifications: true,
  enableSlackNotifications: false,
  notificationBatchInterval: 60,
  maxNotificationsPerBatch: 100,
};

let apiIntegrationSettings: ApiIntegrationSettings = {
  stripeLiveMode: false,
  stripePublicKey: process.env.NEXT_PUBLIC_STRIPE_KEY ?? "",
  googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID,
  enableApiAccess: true,
  rateLimit: 100,
};

const adminUsers: AdminUser[] = [];
const roleManagement: Map<AdminRole, RoleManagement> = new Map();

// Initialize default roles
function initializeRoles(): void {
  const roles: Array<[AdminRole, RoleManagement]> = [
    [
      "super-admin",
      {
        role: "super-admin",
        displayName: "Super Admin",
        description: "Full system access with all permissions",
        permissions: rolePermissionMap["super-admin"],
        userCount: 0,
        isDefault: false,
        isSystemRole: true,
      },
    ],
    [
      "admin",
      {
        role: "admin",
        displayName: "Admin",
        description: "Standard admin access with moderation permissions",
        permissions: rolePermissionMap["admin"],
        userCount: 0,
        isDefault: true,
        isSystemRole: true,
      },
    ],
    [
      "moderator",
      {
        role: "moderator",
        displayName: "Moderator",
        description: "Limited access for content moderation",
        permissions: rolePermissionMap["moderator"],
        userCount: 0,
        isDefault: false,
        isSystemRole: true,
      },
    ],
  ];

  roles.forEach(([role, management]) => {
    roleManagement.set(role, management);
  });
}

initializeRoles();

export function getSettings(): AdminSettings {
  return { ...settings };
}

export function updateSettings(updates: Partial<AdminSettings>): AdminSettings {
  Object.assign(settings, updates);
  void persistSettings();
  return settings;
}

export function getSecuritySettings(): SecuritySettings {
  return { ...securitySettings };
}

export function updateSecuritySettings(
  updates: Partial<SecuritySettings>
): SecuritySettings {
  Object.assign(securitySettings, updates);
  void persistSecuritySettings();
  return securitySettings;
}

export function getNotificationSettings(): NotificationSettings {
  return { ...notificationSettings };
}

export function updateNotificationSettings(
  updates: Partial<NotificationSettings>
): NotificationSettings {
  Object.assign(notificationSettings, updates);
  void persistNotificationSettings();
  return notificationSettings;
}

export function getApiIntegrationSettings(): ApiIntegrationSettings {
  return { ...apiIntegrationSettings };
}

export function updateApiIntegrationSettings(
  updates: Partial<ApiIntegrationSettings>
): ApiIntegrationSettings {
  Object.assign(apiIntegrationSettings, updates);
  void persistApiSettings();
  return apiIntegrationSettings;
}

export function createAdminUser(input: {
  email: string;
  displayName: string;
  role: AdminRole;
  isActive?: boolean;
}): AdminUser {
  const user: AdminUser = {
    id: `admin-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    email: input.email,
    displayName: input.displayName,
    role: input.role,
    permissions: rolePermissionMap[input.role] ?? [],
    isActive: input.isActive ?? true,
    createdAt: new Date().toISOString(),
  };

  adminUsers.push(user);

  // Update role user count
  const role = roleManagement.get(input.role);
  if (role) {
    role.userCount++;
  }

  void persistAdminUser(user);

  return user;
}

export function updateAdminUser(
  userId: string,
  updates: Partial<Omit<AdminUser, "id" | "createdAt">>
): AdminUser | null {
  const user = adminUsers.find((u) => u.id === userId);
  if (!user) return null;

  // Update permissions if role changed
  if (updates.role && updates.role !== user.role) {
    const oldRole = user.role;
    user.permissions = rolePermissionMap[updates.role] ?? [];

    // Update role counts
    const oldRoleManagement = roleManagement.get(oldRole);
    if (oldRoleManagement) oldRoleManagement.userCount--;

    const newRoleManagement = roleManagement.get(updates.role);
    if (newRoleManagement) newRoleManagement.userCount++;
  }

  Object.assign(user, updates);

  void persistAdminUser(user);

  return user;
}

export function deleteAdminUser(userId: string): boolean {
  const index = adminUsers.findIndex((u) => u.id === userId);
  if (index === -1) return false;

  const user = adminUsers[index];
  const role = roleManagement.get(user.role);
  if (role) {
    role.userCount--;
  }

  adminUsers.splice(index, 1);

  return true;
}

export function getAdminUsers(role?: AdminRole): AdminUser[] {
  if (role) {
    return adminUsers.filter((u) => u.role === role);
  }
  return [...adminUsers];
}

export function getAdminUserByEmail(email: string): AdminUser | null {
  return adminUsers.find((u) => u.email === email) ?? null;
}

export function getRoleManagement(): RoleManagement[] {
  return Array.from(roleManagement.values());
}

export function updateRolePermissions(
  role: AdminRole,
  permissions: AdminResourceAction[]
): RoleManagement | null {
  const management = roleManagement.get(role);
  if (!management || management.isSystemRole) return null;

  management.permissions = permissions;

  // Update all users with this role
  adminUsers.forEach((user) => {
    if (user.role === role) {
      user.permissions = permissions;
      void persistAdminUser(user);
    }
  });

  return management;
}

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < securitySettings.minimumPasswordLength) {
    errors.push(
      `Password must be at least ${securitySettings.minimumPasswordLength} characters`
    );
  }

  if (securitySettings.requireNumbersInPassword && !/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (
    securitySettings.requireSpecialCharsInPassword &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push("Password must contain at least one special character");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function isMaintenanceMode(): boolean {
  return settings.maintenanceMode;
}

export function getMaintenanceMessage(): string {
  return (
    settings.maintenanceMessage ??
    "The system is currently under maintenance. Please try again later."
  );
}

async function persistSettings(): Promise<void> {
  try {
    const response = await fetch("/api/admin/settings/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "general", data: settings }),
    });
    if (!response.ok) {
      console.error("Failed to persist settings:", response.statusText);
    }
  } catch (error) {
    console.error("Error persisting settings:", error);
  }
}

async function persistSecuritySettings(): Promise<void> {
  try {
    const response = await fetch("/api/admin/settings/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "security", data: securitySettings }),
    });
    if (!response.ok) {
      console.error("Failed to persist security settings:", response.statusText);
    }
  } catch (error) {
    console.error("Error persisting security settings:", error);
  }
}

async function persistNotificationSettings(): Promise<void> {
  try {
    const response = await fetch("/api/admin/settings/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "notifications", data: notificationSettings }),
    });
    if (!response.ok) {
      console.error("Failed to persist notification settings:", response.statusText);
    }
  } catch (error) {
    console.error("Error persisting notification settings:", error);
  }
}

async function persistApiSettings(): Promise<void> {
  try {
    const response = await fetch("/api/admin/settings/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "api", data: apiIntegrationSettings }),
    });
    if (!response.ok) {
      console.error("Failed to persist API settings:", response.statusText);
    }
  } catch (error) {
    console.error("Error persisting API settings:", error);
  }
}

async function persistAdminUser(user: AdminUser): Promise<void> {
  try {
    const response = await fetch("/api/admin/users/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    if (!response.ok) {
      console.error("Failed to persist admin user:", response.statusText);
    }
  } catch (error) {
    console.error("Error persisting admin user:", error);
  }
}
