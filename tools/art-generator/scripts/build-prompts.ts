import path from "node:path";
import { promises as fs } from "node:fs";
import { loadJsonFile } from "./lib/validation.ts";

type StyleProfile = {
  id: string;
  artStyle: string;
  lighting: string;
  palette?: string[];
  composition: string;
  background: string;
  rendering: string;
  negativePrompt?: string;
};

type MonsterDefinition = {
  monsterId?: string;
  id?: string;
  name: string;
  size: string;
  type: string;
  species: string;
  role: string;
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

type MonsterPrompt = {
  id: string;
  name: string;
  size: string;
  type: string;
  tags: string[];
  framing: "headshot" | "bust" | "full";
  style: {
    artStyle: string;
    lighting: string;
    palette?: string[];
  };
  prompt: string;
  negativePrompt?: string;
  output?: MonsterDefinition["output"];
  notes?: string;
};

type TraitMap = Record<string, string>;

const args = new Map(
  process.argv
    .slice(2)
    .map((arg, index, all) => (arg.startsWith("--") ? [arg, all[index + 1]] : null))
    .filter(Boolean) as Array<[string, string]>
);

const definitionsPath = args.get("--input") ?? "tools/art-generator/data/monster-definitions.json";
const outPath = args.get("--out") ?? "tools/art-generator/data/monster-prompts.json";

const stylePath = args.get("--style") ?? "tools/art-generator/data/styles/bestiary-style.json";
const speciesPath = args.get("--species") ?? "tools/art-generator/data/styles/species-traits.json";
const rolePath = args.get("--role") ?? "tools/art-generator/data/styles/role-traits.json";
const moodPath = args.get("--mood") ?? "tools/art-generator/data/styles/mood-traits.json";

const ensureDir = async (filePath: string) => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
};

const buildPrompt = (parts: Array<string | undefined>) => {
  return parts
    .flatMap((part) => (part ? [part] : []))
    .join(", ")
    .replace(/\s+/g, " ")
    .trim();
};

const main = async () => {
  const style = await loadJsonFile<StyleProfile>(stylePath);
  const speciesTraits = await loadJsonFile<TraitMap>(speciesPath);
  const roleTraits = await loadJsonFile<TraitMap>(rolePath);
  const moodTraits = await loadJsonFile<TraitMap>(moodPath);
  const definitions = await loadJsonFile<MonsterDefinition[]>(definitionsPath);

  if (!Array.isArray(definitions)) {
    throw new Error("Monster definitions must be a JSON array");
  }

  const prompts: MonsterPrompt[] = definitions.map((definition) => {
    const monsterId = definition.monsterId ?? definition.id;
    if (!monsterId) {
      throw new Error("Monster definition missing monsterId");
    }
    const framing = definition.framing ?? "bust";
    const species = speciesTraits[definition.species] ?? definition.species;
    const role = roleTraits[definition.role] ?? definition.role;
    const mood = definition.mood ? moodTraits[definition.mood] ?? definition.mood : undefined;

    const prompt = definition.promptOverride
      ? definition.promptOverride
      : buildPrompt([
          style.composition,
          `${definition.name}, ${framing} portrait`,
          species,
          role,
          mood,
          style.rendering,
          style.artStyle,
          style.lighting,
          style.background
        ]);

    const negativePrompt = definition.negativePromptOverride ?? style.negativePrompt;

    return {
      id: monsterId,
      name: definition.name,
      size: definition.size,
      type: definition.type,
      tags: definition.tags ?? [],
      framing,
      style: {
        artStyle: style.artStyle,
        lighting: style.lighting,
        palette: style.palette
      },
      prompt,
      negativePrompt,
      output: definition.output,
      notes: definition.notes
    };
  });

  await ensureDir(outPath);
  await fs.writeFile(outPath, JSON.stringify(prompts, null, 2));

  const relativeOut = path.relative(process.cwd(), outPath);
  process.stdout.write(`Wrote ${relativeOut}\n`);
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
