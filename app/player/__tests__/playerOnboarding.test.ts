import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeWizardStep, shouldAllowChoose } from "../welcome/wizardState.ts";

describe("player onboarding wizard", () => {
  it("defaults to welcome step", () => {
    assert.equal(normalizeWizardStep(null), "welcome");
    assert.equal(normalizeWizardStep(""), "welcome");
    assert.equal(normalizeWizardStep("other"), "welcome");
  });

  it("accepts choose step", () => {
    assert.equal(normalizeWizardStep("choose"), "choose");
  });

  it("guards choose without context", () => {
    assert.equal(shouldAllowChoose("choose", false), false);
    assert.equal(shouldAllowChoose("welcome", true), false);
    assert.equal(shouldAllowChoose("choose", true), true);
  });
});
