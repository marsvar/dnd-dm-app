import path from "node:path";
import {
  addIssue,
  exitWithIssues,
  isSlug,
  loadJsonFile
} from "./lib/validation.ts";
import type { ValidationIssue } from "./lib/validation.ts";

type MonsterDefinition = {
  monsterId?: string;
  id?: string;
  name?: string;
  size?: string;
  type?: string;
  species?: string;
  role?: string;
  mood?: string;
  framing?: "headshot" | "bust" | "full";
  tags?: string[];
  promptOverride?: string;
  negativePromptOverride?: string;
  output?: {
    portrait?: { width?: number; height?: number; format?: "png" | "webp" };
    token?: { size?: number; format?: "png" | "webp" };
  };
  notes?: string;
};

type TraitMap = Record<string, string>;

const args = new Map(
  process.argv
    .slice(2)
    .map((arg, index, all) => (arg.startsWith("--") ? [arg, all[index + 1]] : null))
    .filter(Boolean) as Array<[string, string]>
);

const strict = process.argv.includes("--strict");

const definitionsPath = args.get("--input") ?? "tools/art-generator/data/monster-definitions.json";
const speciesPath = args.get("--species") ?? "tools/art-generator/data/styles/species-traits.json";
const rolePath = args.get("--role") ?? "tools/art-generator/data/styles/role-traits.json";
const moodPath = args.get("--mood") ?? "tools/art-generator/data/styles/mood-traits.json";

const main = async () => {
  const issues: ValidationIssue[] = [];

  const definitions = await loadJsonFile<MonsterDefinition[]>(definitionsPath);
  const speciesTraits = await loadJsonFile<TraitMap>(speciesPath);
  const roleTraits = await loadJsonFile<TraitMap>(rolePath);
  const moodTraits = await loadJsonFile<TraitMap>(moodPath);

  if (!Array.isArray(definitions)) {
    addIssue(issues, "error", "Monster definitions must be a JSON array");
    exitWithIssues(issues);
    return;
  }

  const ids = new Set<string>();
  definitions.forEach((definition, index) => {
    const monsterId = definition.monsterId ?? definition.id;

    if (strict) {
      if (!definition.monsterId) {
        addIssue(issues, "error", `Definition[${index}] missing monsterId`);
      }
      if (definition.id && definition.monsterId && definition.id !== definition.monsterId) {
        addIssue(
          issues,
          "error",
          `Definition[${index}] id differs from monsterId (${definition.id} != ${definition.monsterId})`
        );
      }
      if (definition.id && !definition.monsterId) {
        addIssue(issues, "error", `Definition[${index}] uses legacy id without monsterId`);
      }
    } else {
      if (!definition.monsterId && !definition.id) {
        addIssue(issues, "error", `Definition[${index}] missing monsterId`);
      }
      if (definition.id && !definition.monsterId) {
        addIssue(issues, "warning", `Definition[${index}] uses deprecated id field; use monsterId`);
      }
    }

    if (!monsterId || !isSlug(monsterId)) {
      addIssue(issues, "error", `Definition[${index}] has invalid monsterId: ${monsterId}`);
    }
    if (monsterId && ids.has(monsterId)) {
      addIssue(issues, "error", `Duplicate monsterId: ${monsterId}`);
    }
    if (monsterId) {
      ids.add(monsterId);
    }

    if (!definition.species) {
      addIssue(issues, "error", `Definition ${monsterId ?? index} missing species`);
    } else if (!speciesTraits[definition.species]) {
      addIssue(issues, "error", `Definition ${monsterId ?? index} unknown species key: ${definition.species}`);
    }

    if (!definition.role) {
      addIssue(issues, "error", `Definition ${monsterId ?? index} missing role`);
    } else if (!roleTraits[definition.role]) {
      addIssue(issues, "error", `Definition ${monsterId ?? index} unknown role key: ${definition.role}`);
    }

    if (!definition.mood) {
      addIssue(issues, "error", `Definition ${monsterId ?? index} missing mood`);
    } else if (!moodTraits[definition.mood]) {
      addIssue(issues, "error", `Definition ${monsterId ?? index} unknown mood key: ${definition.mood}`);
    }

    if (definition.promptOverride && typeof definition.promptOverride !== "string") {
      addIssue(issues, "error", `Definition ${monsterId ?? index} promptOverride must be string`);
    }
    if (definition.negativePromptOverride && typeof definition.negativePromptOverride !== "string") {
      addIssue(issues, "error", `Definition ${monsterId ?? index} negativePromptOverride must be string`);
    }

    if (definition.promptOverride) {
      addIssue(issues, "warning", `Definition ${monsterId ?? index} uses promptOverride`);
    }
    if (definition.negativePromptOverride) {
      addIssue(issues, "warning", `Definition ${monsterId ?? index} uses negativePromptOverride`);
    }
  });

  if (issues.length === 0) {
    const relPath = path.relative(process.cwd(), definitionsPath);
    process.stdout.write(`OK: ${relPath}\n`);
  }

  exitWithIssues(issues);
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
