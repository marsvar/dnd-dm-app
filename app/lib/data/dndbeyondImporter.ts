/**
 * dndbeyondImporter.ts
 *
 * Maps a D&D Beyond character API v5 response to the app's Pc type.
 * Called server-side by /api/import-dndbeyond/route.ts.
 *
 * Only handles publicly-shared characters (privacyType 3).
 * The mapping prioritises accuracy for common cases; exotic homebrew or
 * heavily customised characters may need manual touch-ups after import.
 */

import type {
  AbilityScores,
  Currency,
  Feature,
  Pc,
  SaveProficiencies,
  SkillProficiencies,
  Skills,
  Weapon,
} from "../models/types";
import { getAbilityMod, getProficiencyBonus } from "../engine/pcEngine";

// ─── Look-up tables ───────────────────────────────────────────────────────────

const ABILITY_ID: Record<number, keyof AbilityScores> = {
  1: "str",
  2: "dex",
  3: "con",
  4: "int",
  5: "wis",
  6: "cha",
};

const ABILITY_SCORE_SUBTYPE: Record<string, keyof AbilityScores> = {
  "strength-score": "str",
  "dexterity-score": "dex",
  "constitution-score": "con",
  "intelligence-score": "int",
  "wisdom-score": "wis",
  "charisma-score": "cha",
};

const SKILL_SUBTYPE: Record<string, keyof Skills> = {
  acrobatics: "acrobatics",
  "animal-handling": "animalHandling",
  arcana: "arcana",
  athletics: "athletics",
  deception: "deception",
  history: "history",
  insight: "insight",
  intimidation: "intimidation",
  investigation: "investigation",
  medicine: "medicine",
  nature: "nature",
  perception: "perception",
  performance: "performance",
  persuasion: "persuasion",
  religion: "religion",
  "sleight-of-hand": "sleightOfHand",
  stealth: "stealth",
  survival: "survival",
};

const SAVE_SUBTYPE: Record<string, keyof SaveProficiencies> = {
  "strength-saving-throws": "str",
  "dexterity-saving-throws": "dex",
  "constitution-saving-throws": "con",
  "intelligence-saving-throws": "int",
  "wisdom-saving-throws": "wis",
  "charisma-saving-throws": "cha",
};

const ALIGNMENT_NAMES: Record<number, string> = {
  1: "Lawful Good",
  2: "Neutral Good",
  3: "Chaotic Good",
  4: "Lawful Neutral",
  5: "True Neutral",
  6: "Chaotic Neutral",
  7: "Lawful Evil",
  8: "Neutral Evil",
  9: "Chaotic Evil",
};

// D&D Beyond weapon property IDs
const PROP_FINESSE = 2;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DdbMod = Record<string, any>;

function collectModifiers(data: Record<string, unknown>): DdbMod[] {
  const mods = data.modifiers as Record<string, unknown> | null | undefined;
  if (!mods) return [];
  return [
    ...((mods.race as DdbMod[]) ?? []),
    ...((mods.class as DdbMod[]) ?? []),
    ...((mods.background as DdbMod[]) ?? []),
    ...((mods.feat as DdbMod[]) ?? []),
    ...((mods.item as DdbMod[]) ?? []),
    ...((mods.condition as DdbMod[]) ?? []),
  ];
}

// ─── Main mapping function ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDndBeyondCharacter(raw: any): Omit<Pc, "id"> {
  const data = raw?.data as Record<string, unknown> | null | undefined;
  if (!data) throw new Error("Missing data field in D&D Beyond response");
  if (raw?.success === false) {
    throw new Error(raw?.message ?? "Character not found or is private");
  }

  const allMods = collectModifiers(data);

  // ── Ability Scores ──────────────────────────────────────────────────────────
  const abilities: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

  // 1. Base stats
  for (const stat of (data.stats as DdbMod[]) ?? []) {
    const key = ABILITY_ID[stat.id as number];
    if (key && stat.value != null) abilities[key] = stat.value as number;
  }
  // 2. Override stats (replaces the whole score)
  for (const stat of (data.overrideStats as DdbMod[]) ?? []) {
    const key = ABILITY_ID[stat.id as number];
    if (key && stat.value != null) abilities[key] = stat.value as number;
  }
  // 3. Flat per-stat bonuses
  for (const stat of (data.bonusStats as DdbMod[]) ?? []) {
    const key = ABILITY_ID[stat.id as number];
    if (key && stat.value != null) abilities[key] += stat.value as number;
  }
  // 4. Modifier bonuses from all sources (race ASI, background feat, etc.)
  for (const mod of allMods) {
    if (mod.type !== "bonus") continue;
    const key = ABILITY_SCORE_SUBTYPE[mod.subType as string];
    if (!key) continue;
    const val = (mod.fixedValue ?? mod.value) as number | null;
    if (val != null) abilities[key] += val;
  }

  // ── Level & Class ────────────────────────────────────────────────────────────
  const classes = (data.classes as DdbMod[]) ?? [];
  const primaryClass = classes[0];
  const level = (primaryClass?.level as number) ?? 1;
  const classDefName = (primaryClass?.definition?.name as string) ?? "Adventurer";
  const subclassName = primaryClass?.subclassDefinition?.name as string | undefined;
  const className = subclassName ? `${subclassName} ${classDefName}` : classDefName;
  const hitDie = (primaryClass?.definition?.hitDice as number) ?? 8;
  const hitDice = `${level}d${hitDie}`;
  const proficiencyBonus = getProficiencyBonus(level);

  // ── HP ───────────────────────────────────────────────────────────────────────
  const maxHp =
    ((data.baseHitPoints as number) ?? 8) +
    ((data.bonusHitPoints as number) ?? 0);
  const currentHp =
    data.overrideHitPoints != null
      ? (data.overrideHitPoints as number)
      : Math.max(0, maxHp - ((data.removedHitPoints as number) ?? 0));
  const tempHp = (data.temporaryHitPoints as number) ?? 0;

  // ── Race & Background ────────────────────────────────────────────────────────
  const raceData = data.race as DdbMod | undefined;
  const race = (raceData?.fullName ?? raceData?.baseName ?? "") as string;
  const backgroundData = data.background as DdbMod | undefined;
  const background = (backgroundData?.definition?.name ?? "") as string;
  const alignmentId = (data.alignmentId as number) ?? 0;
  const alignment = ALIGNMENT_NAMES[alignmentId] ?? "";
  const experiencePoints = (data.currentXp as number) ?? 0;

  // ── Skill Proficiencies ──────────────────────────────────────────────────────
  const skillProficiencies: SkillProficiencies = {
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
  for (const mod of allMods) {
    const skillKey = SKILL_SUBTYPE[mod.subType as string];
    if (!skillKey) continue;
    if (mod.type === "expertise") {
      skillProficiencies[skillKey] = "expertise";
    } else if (mod.type === "proficiency" && skillProficiencies[skillKey] !== "expertise") {
      skillProficiencies[skillKey] = "proficient";
    }
  }

  // ── Save Proficiencies ───────────────────────────────────────────────────────
  const saveProficiencies: SaveProficiencies = {
    str: false,
    dex: false,
    con: false,
    int: false,
    wis: false,
    cha: false,
  };
  for (const mod of allMods) {
    const saveKey = SAVE_SUBTYPE[mod.subType as string];
    if (saveKey && mod.type === "proficiency") saveProficiencies[saveKey] = true;
  }

  // ── Passive Perception ───────────────────────────────────────────────────────
  const wisMod = getAbilityMod(abilities.wis);
  const percState = skillProficiencies.perception;
  const percProfBonus =
    percState === "expertise"
      ? 2 * proficiencyBonus
      : percState === "proficient"
        ? proficiencyBonus
        : 0;
  const passivePerception = 10 + wisMod + percProfBonus;

  // ── Speed ────────────────────────────────────────────────────────────────────
  let walkSpeedFt = 30;
  let hasClimbSpeed = false;
  for (const mod of allMods) {
    if (
      (mod.type === "set" || mod.type === "set-base") &&
      mod.subType === "innate-speed-walking"
    ) {
      const v = (mod.fixedValue ?? mod.value) as number | null;
      if (v != null && v > walkSpeedFt) walkSpeedFt = v;
    }
    if (mod.type === "set" && mod.subType === "innate-speed-climbing") {
      hasClimbSpeed = true;
    }
  }
  let speedStr = `${walkSpeedFt} ft.`;
  if (hasClimbSpeed) speedStr += ` (climb ${walkSpeedFt} ft.)`;

  // ── Armor Class ──────────────────────────────────────────────────────────────
  const dexMod = getAbilityMod(abilities.dex);
  let ac = 10 + dexMod;
  let shieldBonus = 0;

  for (const item of (data.inventory as DdbMod[]) ?? []) {
    if (!item.equipped) continue;
    const def = item.definition as DdbMod;
    if (!def) continue;
    if (def.filterType === "Armor") {
      const baseAc = (def.armorClass as number) ?? 0;
      const armorTypeId = def.armorTypeId as number;
      if (armorTypeId === 4) {
        // Shield: adds +2 (stored as armorClass bonus)
        shieldBonus = baseAc;
      } else if (armorTypeId === 1) {
        ac = baseAc + dexMod; // light
      } else if (armorTypeId === 2) {
        ac = baseAc + Math.min(dexMod, 2); // medium
      } else if (armorTypeId === 3) {
        ac = baseAc; // heavy
      }
    }
  }
  ac += shieldBonus;

  // ── Weapons ──────────────────────────────────────────────────────────────────
  const strMod = getAbilityMod(abilities.str);

  // Collect weapon proficiencies
  const profWeaponBaseIds = new Set<number>();
  let profSimple = false;
  let profMartial = false;
  for (const mod of allMods) {
    if (mod.type !== "proficiency") continue;
    if (mod.subType === "simple-weapons") profSimple = true;
    if (mod.subType === "martial-weapons") profMartial = true;
    // entityTypeId 1782728300 = weapon entity type
    if (mod.entityTypeId === 1782728300 && mod.entityId != null) {
      profWeaponBaseIds.add(mod.entityId as number);
    }
  }

  const weapons: Weapon[] = [];
  for (const item of (data.inventory as DdbMod[]) ?? []) {
    const def = item.definition as DdbMod;
    if (def?.filterType !== "Weapon" || !def.damage) continue;

    const propertyIds: number[] = ((def.properties as DdbMod[]) ?? []).map(
      (p) => p.id as number,
    );
    const isFinesse = propertyIds.includes(PROP_FINESSE);
    const isRanged = (def.attackType as number) === 2;

    const abilityMod = isRanged
      ? dexMod
      : isFinesse
        ? Math.max(strMod, dexMod)
        : strMod;

    const catId = (def.categoryId as number) ?? 0;
    const baseItemId = (def.baseItemId ?? def.id) as number;
    const isProficient =
      profWeaponBaseIds.has(baseItemId) ||
      (catId === 1 && profSimple) ||
      (catId === 2 && profMartial);

    const attackBonus = abilityMod + (isProficient ? proficiencyBonus : 0);

    const rangeVal = (def.range as number) ?? 0;
    const longRangeVal = (def.longRange as number) ?? 0;
    const rangeStr = isRanged ? `${rangeVal}/${longRangeVal} ft.` : "5 ft.";

    const propNames: string[] = ((def.properties as DdbMod[]) ?? []).map(
      (p) => (p.name as string).toLowerCase(),
    );

    weapons.push({
      id: String(item.id as number),
      name: def.name as string,
      attackBonus,
      damageDice: (def.damage as DdbMod).diceString as string,
      damageBonus: abilityMod,
      damageType: ((def.damageType as string) ?? "").toLowerCase(),
      range: rangeStr,
      notes: propNames.join(", "),
    });
  }

  // ── Proficiencies text ───────────────────────────────────────────────────────
  const langNames: string[] = [];
  const otherProfNames: string[] = [];
  for (const mod of allMods) {
    const name = mod.friendlySubtypeName as string | undefined;
    if (!name) continue;
    const subType = mod.subType as string;
    if (mod.type === "language") {
      if (!langNames.includes(name)) langNames.push(name);
    } else if (mod.type === "proficiency") {
      // Skip skills, saves, individual weapons, and weapon/armor category groups
      if (
        SKILL_SUBTYPE[subType] ||
        SAVE_SUBTYPE[subType] ||
        subType === "simple-weapons" ||
        subType === "martial-weapons" ||
        mod.entityTypeId === 1782728300
      )
        continue;
      if (!otherProfNames.includes(name)) otherProfNames.push(name);
    }
  }
  const profParts: string[] = [];
  if (langNames.length) profParts.push(`Languages: ${langNames.join(", ")}`);
  if (otherProfNames.length) profParts.push(`Other: ${otherProfNames.join(", ")}`);
  const proficiencies = profParts.join(" | ");

  // ── Equipment text ───────────────────────────────────────────────────────────
  const equipParts: string[] = [];
  for (const item of (data.inventory as DdbMod[]) ?? []) {
    const name = item.definition?.name as string | undefined;
    if (!name) continue;
    const qty = (item.quantity as number) > 1 ? ` ×${item.quantity as number}` : "";
    equipParts.push(`${name}${qty}`);
  }
  const equipment = equipParts.join(", ");

  // ── Senses ────────────────────────────────────────────────────────────────────
  const sensesParts: string[] = [];
  for (const mod of allMods) {
    if (
      (mod.type === "set" || mod.type === "set-base") &&
      mod.subType === "darkvision"
    ) {
      const v = (mod.fixedValue ?? mod.value) as number;
      sensesParts.push(`Darkvision ${v} ft.`);
    }
  }
  const senses = sensesParts.join(", ");

  // ── Features ─────────────────────────────────────────────────────────────────
  const features: Feature[] = [];
  const seenFeatureIds = new Set<number>();

  // Racial traits
  for (const rt of (raceData?.racialTraits as DdbMod[]) ?? []) {
    const def = rt.definition as DdbMod;
    if (!def || def.hideInBuilder) continue;
    const id = def.id as number;
    if (seenFeatureIds.has(id)) continue;
    seenFeatureIds.add(id);
    const desc = def.snippet
      ? stripHtml(def.snippet as string)
      : stripHtml((def.description as string) ?? "");
    features.push({ id: `race-${id}`, name: def.name as string, description: desc });
  }

  // Class features at current level (deduped across base class + subclass)
  for (const entry of (primaryClass?.classFeatures as DdbMod[]) ?? []) {
    const def = entry.definition as DdbMod;
    if (!def || def.hideInBuilder) continue;
    if ((def.requiredLevel as number) > level) continue;
    const id = def.id as number;
    if (seenFeatureIds.has(id)) continue;
    seenFeatureIds.add(id);
    const desc = def.snippet
      ? stripHtml(def.snippet as string)
      : stripHtml((def.description as string) ?? "");
    features.push({ id: `class-${id}`, name: def.name as string, description: desc });
  }

  // Feats
  for (const feat of (data.feats as DdbMod[]) ?? []) {
    const def = feat.definition as DdbMod;
    if (!def) continue;
    const id = def.id as number;
    if (seenFeatureIds.has(id)) continue;
    seenFeatureIds.add(id);
    const categories = (def.categories as DdbMod[]) ?? [];
    // Skip internal ASI pseudo-feats
    if (categories.some((c) => (c.tagName as string)?.startsWith("__"))) continue;
    const desc = def.snippet
      ? stripHtml(def.snippet as string)
      : stripHtml((def.description as string) ?? "");
    features.push({ id: `feat-${id}`, name: def.name as string, description: desc });
  }

  // ── Currency ──────────────────────────────────────────────────────────────────
  const cur = data.currencies as DdbMod | undefined;
  const currency: Currency = cur
    ? {
        pp: (cur.pp as number) ?? 0,
        gp: (cur.gp as number) ?? 0,
        ep: (cur.ep as number) ?? 0,
        sp: (cur.sp as number) ?? 0,
        cp: (cur.cp as number) ?? 0,
      }
    : { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };

  // ── Traits ────────────────────────────────────────────────────────────────────
  const traits = (data.traits as DdbMod) ?? {};

  // ── Visual ────────────────────────────────────────────────────────────────────
  const avatarUrl = (data.decorations as DdbMod)?.avatarUrl as string | undefined;

  // ── Assemble ──────────────────────────────────────────────────────────────────
  return {
    name: (data.name as string) ?? "Unknown",
    playerName: (data.username as string) ?? "",
    className,
    race,
    background,
    alignment,
    experiencePoints,
    level,
    ac,
    maxHp,
    currentHp,
    tempHp,
    hitDice,
    passivePerception,
    abilities,
    proficiencyBonus,
    proficiencyBonusAuto: true,
    saveProficiencies,
    saveBonuses: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    skills: {
      acrobatics: 0,
      animalHandling: 0,
      arcana: 0,
      athletics: 0,
      deception: 0,
      history: 0,
      insight: 0,
      intimidation: 0,
      investigation: 0,
      medicine: 0,
      nature: 0,
      perception: 0,
      performance: 0,
      persuasion: 0,
      religion: 0,
      sleightOfHand: 0,
      stealth: 0,
      survival: 0,
    },
    skillProficiencies,
    speed: speedStr,
    senses,
    proficiencies,
    equipment,
    resources: [],
    notes: traits.backstory ? stripHtml(traits.backstory as string) : "",
    inspiration: (data.inspiration as boolean) ?? false,
    conditions: [],
    visual: { fallback: "initials", imageUrl: avatarUrl },
    deathSaves: { successes: 0, failures: 0, stable: false },
    currency,
    features,
    spellcasting: { spellcastingAbility: null, spellSlots: [] },
    weapons,
    personalityTraits: (traits.personalityTraits as string) ?? "",
    ideals: (traits.ideals as string) ?? "",
    bonds: (traits.bonds as string) ?? "",
    flaws: (traits.flaws as string) ?? "",
    pin: null,
  };
}
