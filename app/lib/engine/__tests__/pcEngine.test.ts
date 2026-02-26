import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Pc } from "../../models/types.ts";
import {
  cycleSkillProficiency,
  DEFAULT_SKILL_PROFICIENCIES,
  formatMod,
  getAbilityMod,
  getInitiativeBonus,
  getPassivePerception,
  getProficiencyBonus,
  getSaveTotal,
  getSkillTotal,
  profMultiplier,
} from "../pcEngine.ts";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const makePC = (overrides: Partial<Pc> = {}): Pc => ({
  id: "test-pc",
  name: "Tara",
  playerName: "Alice",
  className: "Rogue",
  race: "Half-Elf",
  background: "Criminal",
  alignment: "CN",
  experiencePoints: 300,
  level: 1,
  ac: 14,
  maxHp: 8,
  currentHp: 8,
  tempHp: 0,
  hitDice: "1d8",
  passivePerception: 10,
  abilities: { str: 10, dex: 16, con: 12, int: 14, wis: 12, cha: 10 },
  proficiencyBonus: 2,
  proficiencyBonusAuto: true,
  saveProficiencies: {
    str: false, dex: true, con: false,
    int: true, wis: false, cha: false,
  },
  saveBonuses: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  skills: {
    acrobatics: 0, animalHandling: 0, arcana: 0, athletics: 0,
    deception: 0, history: 0, insight: 0, intimidation: 0,
    investigation: 0, medicine: 0, nature: 0, perception: 0,
    performance: 0, persuasion: 0, religion: 0, sleightOfHand: 0,
    stealth: 0, survival: 0,
  },
  skillProficiencies: { ...DEFAULT_SKILL_PROFICIENCIES },
  speed: "30 ft.",
  senses: "",
  proficiencies: "",
  equipment: "",
  resources: [],
  notes: "",
  inspiration: false,
  conditions: [],
  ...overrides,
});

// ---------------------------------------------------------------------------
// getAbilityMod
// ---------------------------------------------------------------------------
describe("getAbilityMod", () => {
  it("returns 0 for score 10", () => {
    assert.equal(getAbilityMod(10), 0);
  });
  it("returns +3 for score 16", () => {
    assert.equal(getAbilityMod(16), 3);
  });
  it("returns -2 for score 7", () => {
    assert.equal(getAbilityMod(7), -2);
  });
  it("rounds down for odd scores", () => {
    assert.equal(getAbilityMod(15), 2); // 15-10=5, floor(5/2)=2
    assert.equal(getAbilityMod(11), 0); // 11-10=1, floor(1/2)=0
  });
});

// ---------------------------------------------------------------------------
// getProficiencyBonus
// ---------------------------------------------------------------------------
describe("getProficiencyBonus", () => {
  it("returns 2 for levels 1–4", () => {
    for (const lv of [1, 2, 3, 4]) {
      assert.equal(getProficiencyBonus(lv), 2, `level ${lv}`);
    }
  });
  it("returns 3 for levels 5–8", () => {
    for (const lv of [5, 6, 7, 8]) {
      assert.equal(getProficiencyBonus(lv), 3, `level ${lv}`);
    }
  });
  it("returns 4 for levels 9–12", () => {
    assert.equal(getProficiencyBonus(9), 4);
    assert.equal(getProficiencyBonus(12), 4);
  });
  it("returns 5 for levels 13–16", () => {
    assert.equal(getProficiencyBonus(13), 5);
    assert.equal(getProficiencyBonus(16), 5);
  });
  it("returns 6 for levels 17–20", () => {
    assert.equal(getProficiencyBonus(17), 6);
    assert.equal(getProficiencyBonus(20), 6);
  });
});

// ---------------------------------------------------------------------------
// profMultiplier
// ---------------------------------------------------------------------------
describe("profMultiplier", () => {
  it("returns 0 for none", () => { assert.equal(profMultiplier("none"), 0); });
  it("returns 1 for proficient", () => { assert.equal(profMultiplier("proficient"), 1); });
  it("returns 2 for expertise", () => { assert.equal(profMultiplier("expertise"), 2); });
});

// ---------------------------------------------------------------------------
// getSkillTotal
// ---------------------------------------------------------------------------
describe("getSkillTotal", () => {
  it("returns ability mod only when no proficiency (DEX 16 → stealth = +3)", () => {
    const pc = makePC();
    assert.equal(getSkillTotal(pc, "stealth"), 3); // DEX mod = +3, none prof
  });

  it("adds proficiency bonus when proficient", () => {
    const pc = makePC({
      skillProficiencies: {
        ...DEFAULT_SKILL_PROFICIENCIES,
        stealth: "proficient",
      },
    });
    // DEX 16 → mod +3, prof +2 → total +5
    assert.equal(getSkillTotal(pc, "stealth"), 5);
  });

  it("doubles proficiency bonus for expertise", () => {
    const pc = makePC({
      skillProficiencies: {
        ...DEFAULT_SKILL_PROFICIENCIES,
        stealth: "expertise",
      },
    });
    // DEX 16 → mod +3, prof×2 = +4 → total +7
    assert.equal(getSkillTotal(pc, "stealth"), 7);
  });

  it("adds manual bonus on top of computed total", () => {
    const pc = makePC({
      skillProficiencies: {
        ...DEFAULT_SKILL_PROFICIENCIES,
        stealth: "proficient",
      },
      skills: {
        acrobatics: 0, animalHandling: 0, arcana: 0, athletics: 0,
        deception: 0, history: 0, insight: 0, intimidation: 0,
        investigation: 0, medicine: 0, nature: 0, perception: 0,
        performance: 0, persuasion: 0, religion: 0, sleightOfHand: 0,
        stealth: 2, // manual bonus from magical boots
        survival: 0,
      },
    });
    // +3 mod + 2 prof + 2 manual = +7
    assert.equal(getSkillTotal(pc, "stealth"), 7);
  });

  it("handles missing skillProficiencies gracefully (old PC data)", () => {
    const pc = makePC();
    // @ts-expect-error intentionally deleting to simulate old saved data
    delete pc.skillProficiencies;
    // Should fall back to "none" — just the ability mod
    assert.equal(getSkillTotal(pc, "stealth"), 3);
  });

  it("uses correct ability for each skill: perception uses WIS", () => {
    const pc = makePC();
    // WIS 12 → mod +1; no proficiency → total +1
    assert.equal(getSkillTotal(pc, "perception"), 1);
  });

  it("uses correct ability for athletics (STR)", () => {
    const pc = makePC();
    // STR 10 → mod 0
    assert.equal(getSkillTotal(pc, "athletics"), 0);
  });
});

// ---------------------------------------------------------------------------
// getSaveTotal
// ---------------------------------------------------------------------------
describe("getSaveTotal", () => {
  it("returns ability mod when not proficient", () => {
    const pc = makePC(); // STR 10, not proficient → +0
    assert.equal(getSaveTotal(pc, "str"), 0);
  });

  it("adds proficiency bonus when proficient (DEX save)", () => {
    const pc = makePC(); // DEX 16 (mod +3) + profBonus 2 = +5
    assert.equal(getSaveTotal(pc, "dex"), 5);
  });

  it("adds saveBonuses override on top", () => {
    const pc = makePC({
      saveBonuses: { str: 2, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    });
    // STR mod 0, not proficient, bonus +2 → total +2
    assert.equal(getSaveTotal(pc, "str"), 2);
  });
});

// ---------------------------------------------------------------------------
// getPassivePerception
// ---------------------------------------------------------------------------
describe("getPassivePerception", () => {
  it("returns 10 + WIS mod when perception not proficient", () => {
    const pc = makePC(); // WIS 12 → mod +1, no prof → 10+1=11
    assert.equal(getPassivePerception(pc), 11);
  });

  it("adds proficiency when perception is proficient", () => {
    const pc = makePC({
      skillProficiencies: {
        ...DEFAULT_SKILL_PROFICIENCIES,
        perception: "proficient",
      },
    });
    // 10 + 1 (WIS mod) + 2 (prof) = 13
    assert.equal(getPassivePerception(pc), 13);
  });

  it("doubles proficiency for expertise", () => {
    const pc = makePC({
      skillProficiencies: {
        ...DEFAULT_SKILL_PROFICIENCIES,
        perception: "expertise",
      },
    });
    // 10 + 1 (WIS mod) + 4 (2×prof) = 15
    assert.equal(getPassivePerception(pc), 15);
  });
});

// ---------------------------------------------------------------------------
// getInitiativeBonus
// ---------------------------------------------------------------------------
describe("getInitiativeBonus", () => {
  it("returns DEX modifier (DEX 16 → +3)", () => {
    const pc = makePC();
    assert.equal(getInitiativeBonus(pc), 3);
  });
  it("returns negative for low DEX", () => {
    const pc = makePC({
      abilities: { str: 10, dex: 7, con: 10, int: 10, wis: 10, cha: 10 },
    });
    assert.equal(getInitiativeBonus(pc), -2);
  });
});

// ---------------------------------------------------------------------------
// cycleSkillProficiency
// ---------------------------------------------------------------------------
describe("cycleSkillProficiency", () => {
  it("cycles none → proficient", () => {
    assert.equal(cycleSkillProficiency("none"), "proficient");
  });
  it("cycles proficient → expertise", () => {
    assert.equal(cycleSkillProficiency("proficient"), "expertise");
  });
  it("cycles expertise → none", () => {
    assert.equal(cycleSkillProficiency("expertise"), "none");
  });
});

// ---------------------------------------------------------------------------
// formatMod
// ---------------------------------------------------------------------------
describe("formatMod", () => {
  it("prefixes positive numbers with +", () => {
    assert.equal(formatMod(3), "+3");
  });
  it("prefixes zero with +", () => {
    assert.equal(formatMod(0), "+0");
  });
  it("keeps minus sign for negatives", () => {
    assert.equal(formatMod(-2), "-2");
  });
});
