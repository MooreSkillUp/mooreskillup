"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { hasAnyUserPermission, hasUserPermission, type AdminResourceAction } from "@/lib/admin-rbac";
import { useAuth } from "@/lib/auth";

export function AdminPermissionGate({
  permissions,
  requireAll = false,
  children,
}: {
  permissions: AdminResourceAction[];
  requireAll?: boolean;
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const allowed = requireAll
    ? permissions.every((permission) => hasUserPermission(user?.permissions, permission))
    : hasAnyUserPermission(user?.permissions, permissions);

  useEffect(() => {
    if (!isLoading && user?.role === "admin" && !allowed) {
      router.replace("/admin/dashboard");
    }
  }, [allowed, isLoading, router, user?.role]);

  if (isLoading) return null;
  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 font-display text-2xl font-bold">Access restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your admin role does not include permission for this area.
        </p>
        <Link href="/admin/dashboard" className="mt-5 inline-block">
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
