export type WizardStep = "welcome" | "choose";

export function normalizeWizardStep(stepParam: string | null): WizardStep {
  return stepParam === "choose" ? "choose" : "welcome";
}

export function shouldAllowChoose(step: WizardStep, hasContext: boolean): boolean {
  return step === "choose" && hasContext;
}
