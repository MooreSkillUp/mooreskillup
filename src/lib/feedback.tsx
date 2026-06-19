"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppLoader } from "@/components/shared/AppLoader";

interface FeedbackContextValue {
  isOverlayVisible: boolean;
  showLoader: (label?: string) => void;
  hideLoader: () => void;
  withLoader: <T>(work: () => Promise<T>, label?: string) => Promise<T>;
  notifySuccess: (message: string, description?: string) => void;
  notifyError: (message: string, description?: string) => void;
  notifyInfo: (message: string, description?: string) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [overlayLabel, setOverlayLabel] = useState<string | null>(null);

  const showLoader = useCallback((label = "Loading MooreSkillUp") => {
    setOverlayLabel(label);
  }, []);

  const hideLoader = useCallback(() => {
    setOverlayLabel(null);
  }, []);

  const withLoader = useCallback(
    async <T,>(work: () => Promise<T>, label?: string) => {
      showLoader(label);
      try {
        return await work();
      } finally {
        hideLoader();
      }
    },
    [hideLoader, showLoader],
  );

  const value = useMemo<FeedbackContextValue>(
    () => ({
      isOverlayVisible: overlayLabel !== null,
      showLoader,
      hideLoader,
      withLoader,
      notifySuccess: (message, description) => toast.success(message, { description }),
      notifyError: (message, description) => toast.error(message, { description }),
      notifyInfo: (message, description) => toast(message, { description }),
    }),
    [hideLoader, overlayLabel, showLoader, withLoader],
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {overlayLabel ? <AppLoader fullScreen label={overlayLabel} /> : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useFeedback must be used within FeedbackProvider");
  }
  return context;
}
