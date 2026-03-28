"use client";

import { ChevronLeft } from "lucide-react";
import { Button, Card, cn } from "../../components/ui";

type WizardLayoutProps = {
  step: number;
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
};

const steps = ["Welcome", "Choose", "Create / Import"];

export default function WizardLayout({
  step,
  title,
  subtitle,
  showBack,
  onBack,
  children,
}: WizardLayoutProps) {
  return (
    <div className="min-h-[calc(100dvh-65px)] px-4 pb-16 pt-12">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <Card className="space-y-6">
          <div className="flex items-center justify-between">
            {showBack ? (
              <Button
                type="button"
                variant="ghost"
                className="gap-2"
                onClick={onBack}
              >
                <ChevronLeft size={16} />
                Back
              </Button>
            ) : (
              <div className="h-9" />
            )}
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Step {step} of 3
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3" aria-label="Onboarding steps">
            {steps.map((label, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === step;
              const isComplete = stepNumber < step;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div
                    aria-current={isActive ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                      isActive
                        ? "border-accent bg-accent/10 text-accent"
                        : isComplete
                          ? "border-black/10 bg-surface-strong text-foreground"
                          : "border-black/10 text-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                        isActive
                          ? "bg-accent text-white"
                          : isComplete
                            ? "bg-surface text-foreground"
                            : "bg-surface-strong text-muted"
                      )}
                    >
                      {stepNumber}
                    </span>
                    {label}
                  </div>
                  {stepNumber < steps.length ? (
                    <div className="hidden h-px w-6 bg-black/10 sm:block" />
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
            {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
          </div>

          <div>{children}</div>
        </Card>
      </div>
    </div>
  );
}
