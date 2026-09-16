"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandSpinner } from "@/components/shared/BrandSpinner";

/**
 * There were two pages for one job: "Notifications" listed broadcast history,
 * "Broadcasts" sent them and listed the same history again — each with its own
 * "Clear history" button. Sending and seeing what was sent belong together.
 */
export default function AdminNotificationsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/broadcast-notifications");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <BrandSpinner size="lg" label="Opening Broadcasts" />
    </div>
  );
}
