"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, ArrowLeft, X, Check } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { useAuth } from "@/lib/auth";

interface TourStep {
  title: string;
  description: string;
  targetId?: string;
}

const STEPS: TourStep[] = [
  {
    title: "Welcome to MooreSkillUp! 🚀",
    description: "We are thrilled to have you here. Let's take a quick 1-minute tour to show you around your personalized learning space.",
  },
  {
    title: "Your Learning Command Center 📊",
    description: "This is your main dashboard content. Here you can track your stats (Enrolled, In Progress, and Completed courses), view your certificates, and resume your recent lessons with a single click.",
    targetId: "tour-content",
  },
  {
    title: "Navigate with Ease 🗺️",
    description: "The Sidebar is your map. Browse all available courses, track your payments, purchase rewards in the Quiz Shop, and check your rank on the global leaderboard.",
    targetId: "tour-sidebar",
  },
  {
    title: "Quick Controls & Settings ⚙️",
    description: "Use the Top Navbar to check your notifications, toggle between Light and Dark mode, or click your profile avatar to update your account settings.",
    targetId: "tour-header",
  },
  {
    title: "Ready to Learn? 🎓",
    description: "You are all set! Let's kickstart your growth by checking out the courses in your path.",
  }
];

export function OnboardingTour() {
  const { user, completeOnboarding } = useAuth();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);

  // Only show the tour for students who haven't completed onboarding
  useEffect(() => {
    if (user?.role === "student" && !user?.isOnboarded) {
      // Delay slightly to allow the page to fully render and measure targets
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Sidebar auto open/close for mobile
  useEffect(() => {
    if (!visible) return;
    const targetId = STEPS[step].targetId;

    if (targetId === "tour-sidebar") {
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        const menuButton = document.querySelector('[aria-label="Open menu"]') as HTMLButtonElement;
        if (menuButton) {
          menuButton.click();
        }
      }
    } else {
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        const closeButton = document.querySelector('[aria-label="Close menu"]') as HTMLButtonElement;
        if (closeButton) {
          closeButton.click();
        }
      }
    }
  }, [step, visible]);

  useEffect(() => {
    if (!visible) return;

    const targetId = STEPS[step].targetId;
    if (!targetId) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.getElementById(targetId);
      if (el) {
        setRect(el.getBoundingClientRect());
        // Scroll target into view if needed
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setRect(null);
      }
    };

    // Small delay to ensure any layout shifts or sidebar open animations have completed
    const timeout = setTimeout(updateRect, 350);

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, [step, visible]);

  if (!visible) return null;

  const currentStep = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setStep((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    // If mobile sidebar is open, make sure to close it when closing tour
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      const closeButton = document.querySelector('[aria-label="Close menu"]') as HTMLButtonElement;
      if (closeButton) {
        closeButton.click();
      }
    }
    setVisible(false);
    try {
      await completeOnboarding();
    } catch (err) {
      console.error("Failed to complete onboarding", err);
    }
  };

  return (
    <AnimatePresence>
      {/* Background dimmer overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm pointer-events-auto"
      />

      {/* Target spotlight glow effect */}
      {rect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="fixed pointer-events-none z-45 rounded-[2rem] border-2 border-primary shadow-[0_0_30px_rgba(11,100,244,0.5)] transition-all duration-300 bg-primary/5"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
          }}
        />
      )}

      {/* Tour card container */}
      <div className="fixed inset-x-0 bottom-0 lg:bottom-8 lg:right-8 lg:left-auto z-50 flex justify-center lg:justify-end p-4 lg:p-0 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 250 }}
          className="w-full max-w-md pointer-events-auto rounded-[2rem] border border-border bg-card/90 backdrop-blur-xl p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle background glow decorator */}
          <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          {/* Close / Skip button */}
          <button
            onClick={handleComplete}
            className="absolute right-6 top-6 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Skip onboarding tour"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Icon Badge */}
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>

          {/* Content */}
          <div className="space-y-3">
            <h3 className="font-display text-2xl font-bold tracking-tight">
              {currentStep.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Footer controls */}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
            {/* Step dots */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === step ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              {!isFirst && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="rounded-xl px-4"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              )}
              <Button
                variant="accent"
                size="sm"
                onClick={handleNext}
                className="rounded-xl px-5"
              >
                {isLast ? (
                  <>
                    Finish <Check className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    Next <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
