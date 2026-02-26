/**
 * pcEngine.ts — Pure functions for deriving PC stats.
 *
 * All computations are deterministic and dependency-free so they can be:
 * - Imported by the DM character sheet (app/components/PcCard.tsx)
 * - Imported by a future player view without store coupling
 * - Tested in isolation (see __tests__/pcEngine.test.ts)
 *
 * The `skills: Skills` field on Pc is treated as a per-skill MANUAL BONUS
 * added on top of the auto-computed total (ability mod + prof multiplier × prof bonus).
 * This allows the DM to apply context-specific overrides (e.g. race bonuses, magical items)
 * without losing the automatic computation.
 */

import type {
  AbilityScores,
  Pc,
  SkillProficiencies,
  SkillProficiency,
  Skills,
} from "../models/types";

// ---------------------------------------------------------------------------
// Display maps
// ---------------------------------------------------------------------------

export const ABILITY_LABELS: Record<keyof AbilityScores, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

export const ABILITY_ABBREV: Record<keyof AbilityScores, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
};

export const SKILL_LABELS: Record<keyof Skills, string> = {
  acrobatics: "Acrobatics",
  animalHandling: "Animal Handling",
  arcana: "Arcana",
  athletics: "Athletics",
  deception: "Deception",
  history: "History",
  insight: "Insight",
  intimidation: "Intimidation",
  investigation: "Investigation",
  medicine: "Medicine",
  nature: "Nature",
  perception: "Perception",
  performance: "Performance",
  persuasion: "Persuasion",
  religion: "Religion",
  sleightOfHand: "Sleight of Hand",
  stealth: "Stealth",
  survival: "Survival",
};

/** Which ability score drives each skill. */
export const SKILL_ABILITY: Record<keyof Skills, keyof AbilityScores> = {
  acrobatics: "dex",
  animalHandling: "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  sleightOfHand: "dex",
  stealth: "dex",
  survival: "wis",
};

/** All 18 skills in display order (alphabetical by label). */
export const ALL_SKILLS = Object.keys(SKILL_LABELS) as (keyof Skills)[];

// ---------------------------------------------------------------------------
// Default values (used for new PCs and migration)
// ---------------------------------------------------------------------------

export const DEFAULT_SKILL_PROFICIENCIES: SkillProficiencies = {
  acrobatics: "none",
  animalHandling: "none",
  arcana: "none",
  athletics: "none",
  deception: "none",
  history: "none",
  insight: "none",
  intimidation: "none",
  investigation: "none",
  medicine: "none",
  nature: "none",
  perception: "none",
  performance: "none",
  persuasion: "none",
  religion: "none",
  sleightOfHand: "none",
  stealth: "none",
  survival: "none",
};

// ---------------------------------------------------------------------------
// Core stat derivations
// ---------------------------------------------------------------------------

/** Standard D&D 5e ability modifier formula. */
export const getAbilityMod = (score: number): number =>
  Math.floor((score - 10) / 2);

/** D&D 5e proficiency bonus by character level. */
export const getProficiencyBonus = (level: number): number => {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
};

/** Multiplier applied to proficiency bonus for a given proficiency state. */
export const profMultiplier = (state: SkillProficiency): number => {
  if (state === "expertise") return 2;
  if (state === "proficient") return 1;
  return 0;
};

/**
 * Full auto-computed skill total:
 * abilityMod + profMultiplier × profBonus + pc.skills[skill] (manual bonus)
 */
export const getSkillTotal = (pc: Pc, skill: keyof Skills): number => {
  const ability = SKILL_ABILITY[skill];
  const abilityMod = getAbilityMod(pc.abilities[ability]);
  const profState = pc.skillProficiencies?.[skill] ?? "none";
  const profBonus = pc.proficiencyBonus;
  const manualBonus = pc.skills?.[skill] ?? 0;
  return abilityMod + profMultiplier(profState) * profBonus + manualBonus;
};

/**
 * Full auto-computed saving throw total:
 * abilityMod + (proficient ? profBonus : 0) + saveBonuses[ability]
 */
export const getSaveTotal = (pc: Pc, ability: keyof AbilityScores): number => {
  const mod = getAbilityMod(pc.abilities[ability]);
  const profBonus = pc.saveProficiencies[ability] ? pc.proficiencyBonus : 0;
  const bonus = pc.saveBonuses?.[ability] ?? 0;
  return mod + profBonus + bonus;
};

/** Passive Perception = 10 + perception skill total (includes proficiency and manual bonus). */
export const getPassivePerception = (pc: Pc): number =>
  10 + getSkillTotal(pc, "perception");

/** Initiative bonus = DEX modifier. */
export const getInitiativeBonus = (pc: Pc): number =>
  getAbilityMod(pc.abilities.dex);

/** Format a number as a signed modifier string: +3, -1, +0 */
export const formatMod = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);

// ---------------------------------------------------------------------------
// Proficiency cycling
// ---------------------------------------------------------------------------

/** Cycles proficiency state on click: none → proficient → expertise → none */
export const cycleSkillProficiency = (
  current: SkillProficiency
): SkillProficiency => {
  if (current === "none") return "proficient";
  if (current === "proficient") return "expertise";
  return "none";
};
