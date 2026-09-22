"use client";

import { useCallback, useEffect, useState } from "react";

import { authenticatedRequest } from "./authenticated-api";

export interface Ambassador {
  id: string;
  name: string;
  code: string;
  phone: string;
  email: string;
  community: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  /** Visits through the link, once per browser session. */
  clicks: number;
  /** Began signing up with the code, not yet verified. */
  started: number;
  verified: number;
  /** Paid with live money. Test-key checkouts are not counted. */
  paying: number;
}

export type AmbassadorInput = Partial<
  Pick<Ambassador, "name" | "code" | "phone" | "email" | "community" | "notes" | "isActive">
>;

export function useAmbassadors(enabled = true) {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    try {
      setAmbassadors(await authenticatedRequest<Ambassador[]>("/api/admin/ambassadors/"));
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not load ambassadors.");
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (input: AmbassadorInput) => {
    const created = await authenticatedRequest<Ambassador>("/api/admin/ambassadors/", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setAmbassadors((current) => [created, ...current]);
    return created;
  }, []);

  const update = useCallback(async (id: string, input: AmbassadorInput) => {
    const saved = await authenticatedRequest<Ambassador>(`/api/admin/ambassadors/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    setAmbassadors((current) => current.map((item) => (item.id === id ? saved : item)));
    return saved;
  }, []);

  return { ambassadors, isLoading, error, refresh, create, update };
}

/** The link an ambassador shares. Built from the current origin. */
export function ambassadorLink(code: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/auth/register?ref=${code}`;
}
