import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

interface TutorialStep {
  targetSelector: string;
  titleKey: string;
  descriptionKey: string;
  placement?: "top" | "bottom" | "left" | "right";
  sidebarItem?: boolean;
}

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  startTutorial: () => void;
  endTutorial: () => void;
  hasCompleted: boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}

export function useTutorialSafe() {
  return useContext(TutorialContext);
}

const leaderSteps: TutorialStep[] = [
  {
    targetSelector: '[data-sidebar="header"]',
    titleKey: "tutorial.steps.welcome.title",
    descriptionKey: "tutorial.steps.welcome.description",
    placement: "right",
  },
  {
    targetSelector: '[href="/leader/dashboard"]',
    titleKey: "tutorial.steps.dashboard.title",
    descriptionKey: "tutorial.steps.dashboard.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/leader/converts"]',
    titleKey: "tutorial.steps.converts.title",
    descriptionKey: "tutorial.steps.converts.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/leader/new-members"]',
    titleKey: "tutorial.steps.newMembers.title",
    descriptionKey: "tutorial.steps.newMembers.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/leader/members"]',
    titleKey: "tutorial.steps.members.title",
    descriptionKey: "tutorial.steps.members.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/leader/followups"]',
    titleKey: "tutorial.steps.followUps.title",
    descriptionKey: "tutorial.steps.followUps.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/leader/mass-followup"]',
    titleKey: "tutorial.steps.massFollowUp.title",
    descriptionKey: "tutorial.steps.massFollowUp.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/leader/announcements"]',
    titleKey: "tutorial.steps.announcements.title",
    descriptionKey: "tutorial.steps.announcements.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/leader/prayer-requests"]',
    titleKey: "tutorial.steps.prayerRequests.title",
    descriptionKey: "tutorial.steps.prayerRequests.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[data-testid="button-user-menu"]',
    titleKey: "tutorial.steps.userMenu.title",
    descriptionKey: "tutorial.steps.userMenu.description",
    placement: "top",
  },
];

const ministryAdminSteps: TutorialStep[] = [
  {
    targetSelector: '[data-sidebar="header"]',
    titleKey: "tutorial.steps.welcome.title",
    descriptionKey: "tutorial.steps.welcomeAdmin.description",
    placement: "right",
  },
  {
    targetSelector: '[href="/ministry-admin/dashboard"]',
    titleKey: "tutorial.steps.dashboard.title",
    descriptionKey: "tutorial.steps.dashboardAdmin.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/ministry-admin/converts"]',
    titleKey: "tutorial.steps.converts.title",
    descriptionKey: "tutorial.steps.converts.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/ministry-admin/new-members"]',
    titleKey: "tutorial.steps.newMembers.title",
    descriptionKey: "tutorial.steps.newMembers.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/ministry-admin/members"]',
    titleKey: "tutorial.steps.members.title",
    descriptionKey: "tutorial.steps.members.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/ministry-admin/followups"]',
    titleKey: "tutorial.steps.followUps.title",
    descriptionKey: "tutorial.steps.followUps.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/ministry-admin/leaders"]',
    titleKey: "tutorial.steps.manageLeaders.title",
    descriptionKey: "tutorial.steps.manageLeaders.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/ministry-admin/member-accounts"]',
    titleKey: "tutorial.steps.memberAccounts.title",
    descriptionKey: "tutorial.steps.memberAccounts.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/ministry-admin/form-settings"]',
    titleKey: "tutorial.steps.formSettings.title",
    descriptionKey: "tutorial.steps.formSettings.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/ministry-admin/settings"]',
    titleKey: "tutorial.steps.settings.title",
    descriptionKey: "tutorial.steps.settings.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/ministry-admin/billing"]',
    titleKey: "tutorial.steps.billing.title",
    descriptionKey: "tutorial.steps.billing.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[data-testid="button-user-menu"]',
    titleKey: "tutorial.steps.userMenu.title",
    descriptionKey: "tutorial.steps.userMenu.description",
    placement: "top",
  },
];

const adminSteps: TutorialStep[] = [
  {
    targetSelector: '[data-sidebar="header"]',
    titleKey: "tutorial.steps.welcome.title",
    descriptionKey: "tutorial.steps.welcomePlatform.description",
    placement: "right",
  },
  {
    targetSelector: '[href="/admin/dashboard"]',
    titleKey: "tutorial.steps.dashboard.title",
    descriptionKey: "tutorial.steps.dashboardPlatform.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/admin/churches"]',
    titleKey: "tutorial.steps.ministries.title",
    descriptionKey: "tutorial.steps.ministries.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/admin/leaders"]',
    titleKey: "tutorial.steps.allLeaders.title",
    descriptionKey: "tutorial.steps.allLeaders.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/admin/converts"]',
    titleKey: "tutorial.steps.allConverts.title",
    descriptionKey: "tutorial.steps.allConverts.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[href="/admin/ministry-requests"]',
    titleKey: "tutorial.steps.ministryRequests.title",
    descriptionKey: "tutorial.steps.ministryRequests.description",
    placement: "right",
    sidebarItem: true,
  },
  {
    targetSelector: '[data-testid="button-user-menu"]',
    titleKey: "tutorial.steps.userMenu.title",
    descriptionKey: "tutorial.steps.userMenu.description",
    placement: "top",
  },
];

function getStepsForRole(role: string | undefined): TutorialStep[] {
  switch (role) {
    case "ADMIN":
      return adminSteps;
    case "MINISTRY_ADMIN":
      return ministryAdminSteps;
    case "LEADER":
      return leaderSteps;
    default:
      return [];
  }
}

function getStorageKey(role: string | undefined) {
  return `tutorial_completed_${role || "unknown"}`;
}

function TutorialOverlay({
  steps,
  currentStep,
  onNext,
  onPrev,
  onEnd,
}: {
  steps: TutorialStep[];
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onEnd: () => void;
}) {
  const { t } = useTranslation();
  const [tooltipPos, setTooltipPos] = useState<{
    top: number;
    left: number;
    targetRect: DOMRect | null;
  }>({ top: 0, left: 0, targetRect: null });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  const positionTooltip = useCallback(() => {
    if (!step) return;

    const el = document.querySelector(step.targetSelector);
    if (!el) {
      setTooltipPos({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 160, targetRect: null });
      return;
    }

    const rect = el.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 200;
    const padding = 12;

    let top = 0;
    let left = 0;
    const placement = step.placement || "right";

    switch (placement) {
      case "right":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + padding;
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - padding;
        break;
      case "bottom":
        top = rect.bottom + padding;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case "top":
        top = rect.top - tooltipHeight - padding;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
    }

    top = Math.max(8, Math.min(top, window.innerHeight - tooltipHeight - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));

    setTooltipPos({ top, left, targetRect: rect });

    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [step]);

  useEffect(() => {
    positionTooltip();
    const timer = setTimeout(positionTooltip, 100);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEnd();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("resize", positionTooltip);
    window.addEventListener("scroll", positionTooltip, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", positionTooltip);
      window.removeEventListener("scroll", positionTooltip, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [positionTooltip, currentStep, onEnd, onNext, onPrev]);

  if (!step) return null;

  const { targetRect } = tooltipPos;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" data-testid="tutorial-overlay">
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 4}
                y={targetRect.top - 4}
                width={targetRect.width + 8}
                height={targetRect.height + 8}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tutorial-mask)"
          style={{ pointerEvents: "auto" }}
          onClick={onEnd}
        />
      </svg>

      {targetRect && (
        <div
          className="absolute rounded-lg pointer-events-none"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: "0 0 0 3px hsl(var(--primary)), 0 0 16px 4px hsl(var(--primary) / 0.3)",
          }}
        />
      )}

      <div
        ref={tooltipRef}
        className="absolute bg-card border border-border rounded-xl shadow-2xl p-5 w-80 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ top: tooltipPos.top, left: tooltipPos.left, zIndex: 10000 }}
        data-testid="tutorial-tooltip"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-foreground">{t(step.titleKey)}</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mt-1 -mr-1"
            onClick={onEnd}
            data-testid="button-tutorial-close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {t(step.descriptionKey)}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t("tutorial.stepCounter", { current: currentStep + 1, total: steps.length })}
          </span>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={onPrev}
                data-testid="button-tutorial-prev"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                {t("tutorial.previous")}
              </Button>
            )}
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={onNext}
              data-testid="button-tutorial-next"
            >
              {isLast ? t("tutorial.finish") : t("tutorial.next")}
              {!isLast && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
            </Button>
          </div>
        </div>

        <div className="flex gap-1 justify-center mt-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === currentStep
                  ? "w-4 bg-primary"
                  : i < currentStep
                    ? "w-1.5 bg-primary/40"
                    : "w-1.5 bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);

  const steps = getStepsForRole(user?.role);

  useEffect(() => {
    if (user?.role) {
      const completed = localStorage.getItem(getStorageKey(user.role)) === "true";
      setHasCompleted(completed);
      if (!completed) {
        const timer = setTimeout(() => {
          setIsActive(true);
          setCurrentStep(0);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [user?.role]);

  const startTutorial = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const endTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    if (user?.role) {
      localStorage.setItem(getStorageKey(user.role), "true");
      setHasCompleted(true);
    }
  }, [user?.role]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      endTutorial();
    }
  }, [currentStep, steps.length, endTutorial]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        totalSteps: steps.length,
        startTutorial,
        endTutorial,
        hasCompleted,
      }}
    >
      {children}
      {isActive && steps.length > 0 && (
        <TutorialOverlay
          steps={steps}
          currentStep={currentStep}
          onNext={handleNext}
          onPrev={handlePrev}
          onEnd={endTutorial}
        />
      )}
    </TutorialContext.Provider>
  );
}
