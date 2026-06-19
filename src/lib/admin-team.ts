import { useCallback, useEffect, useState } from "react";
import { authenticatedRequest, normalizeListPayload } from "./authenticated-api";

/** Backend tier codes (snake_case, as stored in the database). */
export type AdminTierCode = "super_admin" | "admin" | "moderator";

export const ADMIN_TIER_LABELS: Record<AdminTierCode, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  moderator: "Moderator",
};

export const ADMIN_TIER_DESCRIPTIONS: Record<AdminTierCode, string> = {
  super_admin: "Full control: manages the admin team, settings, payments, and everything below.",
  admin: "Runs daily operations: teachers, students, courses, broadcasts, and support.",
  moderator: "Reviews courses, moderates reviews, and handles support tickets. No access to people or money.",
};

export interface AdminPermissionOverrides {
  grant: string[];
  revoke: string[];
}

export interface AdminTeamMember {
  id: string;
  email: string;
  username: string;
  displayName: string;
  adminRole: AdminTierCode;
  status: "active" | "disabled";
  dateJoined?: string;
  lastLogin?: string | null;
  temporaryPassword?: string | null;
  permissions?: string[];
  permissionOverrides?: AdminPermissionOverrides;
  twoFactorEnabled?: boolean;
}

export interface CreateAdminPayload {
  displayName: string;
  email: string;
  adminRole: Exclude<AdminTierCode, "super_admin"> | "super_admin";
  password?: string;
}

export function useAdminTeam() {
  const [admins, setAdmins] = useState<AdminTeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const payload = await authenticatedRequest("/api/admin/admins/");
      setAdmins(normalizeListPayload<AdminTeamMember>(payload));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load admin team.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createAdmin = useCallback(
    async (payload: CreateAdminPayload) => {
      const created = await authenticatedRequest<AdminTeamMember>("/api/admin/admins/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await refresh();
      return created;
    },
    [refresh],
  );

  const updateAdmin = useCallback(
    async (adminId: string, patch: { adminRole?: AdminTierCode; status?: "active" | "disabled"; displayName?: string }) => {
      const updated = await authenticatedRequest<AdminTeamMember>(`/api/admin/admins/${adminId}/`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await refresh();
      return updated;
    },
    [refresh],
  );

  const deleteAdmin = useCallback(
    async (adminId: string) => {
      await authenticatedRequest(`/api/admin/admins/${adminId}/`, { method: "DELETE" });
      await refresh();
    },
    [refresh],
  );

  const resendCredentials = useCallback(async (adminId: string) => {
    return authenticatedRequest<{ detail: string }>(
      `/api/admin/admins/${adminId}/resend-credentials/`,
      { method: "POST" },
    );
  }, []);

  const updatePermissions = useCallback(
    async (adminId: string, overrides: AdminPermissionOverrides) => {
      const updated = await authenticatedRequest<AdminTeamMember>(
        `/api/admin/admins/${adminId}/permissions/`,
        { method: "PATCH", body: JSON.stringify(overrides) },
      );
      await refresh();
      return updated;
    },
    [refresh],
  );

  return {
    admins,
    isLoading,
    error,
    refresh,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    resendCredentials,
    updatePermissions,
  };
}
