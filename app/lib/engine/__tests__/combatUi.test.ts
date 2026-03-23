import test from "node:test";
import assert from "node:assert/strict";
import { shouldShowCombatActivePill } from "../combatUi.ts";
import type { ActiveRole } from "../../store/roleStore";

const run = (pathname: string, activeRole: ActiveRole, hasRunning: boolean) =>
  shouldShowCombatActivePill({ pathname, activeRole, hasRunning });

test("shows pill only for dm with running encounter", () => {
  assert.equal(run("/encounters", "dm", true), true);
  assert.equal(run("/encounters", "dm", false), false);
});

test("hides pill for player role", () => {
  assert.equal(run("/encounters", "player", true), false);
});

test("hides pill on player routes", () => {
  assert.equal(run("/player/encounter", "dm", true), false);
  assert.equal(run("/player/character", "dm", true), false);
});
