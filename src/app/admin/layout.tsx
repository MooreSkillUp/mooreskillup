"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FirstLoginPasswordModal } from "@/components/shared/FirstLoginPasswordModal";
import { useAuth } from "@/lib/auth";
import { authenticatedRequest } from "@/lib/authenticated-api";

function AdminPasswordPrompt() {
  const { user, refreshCurrentUser, isLoading: authLoading } = useAuth();
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    setPasswordPromptOpen(Boolean(user?.mustChangePassword));
  }, [authLoading, user?.mustChangePassword]);

  return (
    <FirstLoginPasswordModal
      open={passwordPromptOpen}
      roleLabel={user?.adminRole === "moderator" ? "moderator" : "admin"}
      onChangePassword={async (newPassword) => {
        await authenticatedRequest("/api/auth/change-password/", {
          method: "POST",
          body: JSON.stringify({
            current_password: "",
            new_password: newPassword,
          }),
        });
        await refreshCurrentUser();
        setPasswordPromptOpen(false);
      }}
    />
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminPasswordPrompt />
      {children}
    </>
  );
}
