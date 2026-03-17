import path from "node:path";
import {
  addIssue,
  exitWithIssues,
  isSafeFilename,
  isSlug,
  loadJsonFile
} from "./lib/validation.ts";
import type { ValidationIssue } from "./lib/validation.ts";

type MonsterPrompt = {
  id: string;
  name: string;
  size: string;
  type: string;
  framing: "headshot" | "bust" | "full";
  style: { artStyle: string; lighting: string };
  prompt: string;
  negativePrompt?: string;
  variants?: number;
  output?: {
    portrait?: { width?: number; height?: number; format?: "png" | "webp" };
    token?: { size?: number; format?: "png" | "webp" };
  };
};

const defaultPath = "tools/art-generator/data/monster-prompts.json";
const args = process.argv.slice(2);
const promptPath = args[0] ?? defaultPath;

const validatePrompt = (prompt: MonsterPrompt, index: number, ids: Set<string>, issues: ValidationIssue[]) => {
  if (!prompt.id || !isSlug(prompt.id)) {
    addIssue(issues, "error", `Prompt[${index}] has invalid id: ${prompt.id}`);
  }
  if (prompt.id && ids.has(prompt.id)) {
    addIssue(issues, "error", `Duplicate prompt id: ${prompt.id}`);
  }
  if (prompt.id) {
    ids.add(prompt.id);
  }
  if (!prompt.name) {
    addIssue(issues, "error", `Prompt[${index}] missing name`);
  }
  if (!prompt.size) {
    addIssue(issues, "error", `Prompt[${index}] missing size`);
  }
  if (!prompt.type) {
    addIssue(issues, "error", `Prompt[${index}] missing type`);
  }
  if (!prompt.framing) {
    addIssue(issues, "error", `Prompt[${index}] missing framing`);
  }
  if (!prompt.style?.artStyle || !prompt.style?.lighting) {
    addIssue(issues, "error", `Prompt[${index}] missing style fields`);
  }
  if (!prompt.prompt) {
    addIssue(issues, "error", `Prompt[${index}] missing prompt text`);
  }

  const portraitFormat = prompt.output?.portrait?.format;
  if (portraitFormat && portraitFormat !== "png" && portraitFormat !== "webp") {
    addIssue(issues, "error", `Prompt[${index}] has invalid portrait format: ${portraitFormat}`);
  }
  const tokenFormat = prompt.output?.token?.format;
  if (tokenFormat && tokenFormat !== "png" && tokenFormat !== "webp") {
    addIssue(issues, "error", `Prompt[${index}] has invalid token format: ${tokenFormat}`);
  }

  if (prompt.variants && (prompt.variants < 1 || prompt.variants > 8)) {
    addIssue(issues, "error", `Prompt[${index}] variants out of range: ${prompt.variants}`);
  }

  const portraitFilename = `${prompt.id}.${portraitFormat ?? "png"}`;
  if (!isSafeFilename(portraitFilename)) {
    addIssue(issues, "error", `Prompt[${index}] produces unsafe portrait filename: ${portraitFilename}`);
  }

  const tokenFilename = `${prompt.id}-token.${tokenFormat ?? "png"}`;
  if (!isSafeFilename(tokenFilename)) {
    addIssue(issues, "error", `Prompt[${index}] produces unsafe token filename: ${tokenFilename}`);
  }
};

const main = async () => {
  const issues: ValidationIssue[] = [];
  const prompts = await loadJsonFile<MonsterPrompt[]>(promptPath);

  if (!Array.isArray(prompts)) {
    addIssue(issues, "error", "Prompt file must be a JSON array");
    exitWithIssues(issues);
    return;
  }

  const ids = new Set<string>();
  prompts.forEach((prompt, index) => validatePrompt(prompt, index, ids, issues));

  const relPath = path.relative(process.cwd(), promptPath);
  if (issues.length === 0) {
    process.stdout.write(`OK: ${relPath}\n`);
  }

  exitWithIssues(issues);
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
