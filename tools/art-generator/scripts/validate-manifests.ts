import path from "node:path";
import {
  addIssue,
  exitWithIssues,
  hasPathTraversal,
  isItemId,
  isSafeFilename,
  isUnderDir,
  loadJsonFile
} from "./lib/validation.ts";
import type { ValidationIssue } from "./lib/validation.ts";

type PortraitManifestItem = {
  itemId: string;
  promptId: string;
  variant?: number;
  status: "pending" | "generated" | "failed";
  outputs: {
    portrait: { filename: string; format: "png" | "webp" };
    token: { filename: string; format: "png" | "webp" };
  };
};

type PortraitManifest = {
  manifestId: string;
  createdAt: string;
  provider: string;
  items: PortraitManifestItem[];
};

type TokenManifestItem = {
  itemId: string;
  sourcePortrait: string;
  tokenOutput: string;
  status: "pending" | "generated" | "failed";
};

type TokenManifest = {
  manifestId: string;
  createdAt: string;
  sourceManifest: string;
  items: TokenManifestItem[];
};

const args = new Map(
  process.argv
    .slice(2)
    .map((arg, index, all) => (arg.startsWith("--") ? [arg, all[index + 1]] : null))
    .filter(Boolean) as Array<[string, string]>
);

const portraitPath = args.get("--portrait");
const tokenPath = args.get("--token");

const validatePortraitManifest = (manifest: PortraitManifest, issues: ValidationIssue[]) => {
  if (!manifest.manifestId) {
    addIssue(issues, "error", "Portrait manifest missing manifestId");
  }
  if (!manifest.createdAt) {
    addIssue(issues, "error", "Portrait manifest missing createdAt");
  }
  if (!manifest.provider) {
    addIssue(issues, "error", "Portrait manifest missing provider");
  }
  if (!Array.isArray(manifest.items)) {
    addIssue(issues, "error", "Portrait manifest items missing or not array");
    return;
  }

  const ids = new Set<string>();
  for (const item of manifest.items) {
    if (!item.itemId || !isItemId(item.itemId)) {
      addIssue(issues, "error", `Portrait item has invalid itemId: ${item.itemId}`);
    }
    if (item.itemId && ids.has(item.itemId)) {
      addIssue(issues, "error", `Duplicate portrait itemId: ${item.itemId}`);
    }
    if (item.itemId) {
      ids.add(item.itemId);
    }
    if (!item.promptId) {
      addIssue(issues, "error", `Portrait item ${item.itemId} missing promptId`);
    }
    if (!item.outputs?.portrait?.filename || !item.outputs?.token?.filename) {
      addIssue(issues, "error", `Portrait item ${item.itemId} missing output filenames`);
      continue;
    }

    if (!isSafeFilename(item.outputs.portrait.filename)) {
      addIssue(issues, "error", `Portrait item ${item.itemId} has unsafe portrait filename: ${item.outputs.portrait.filename}`);
    }
    if (!isSafeFilename(item.outputs.token.filename)) {
      addIssue(issues, "error", `Portrait item ${item.itemId} has unsafe token filename: ${item.outputs.token.filename}`);
    }
  }
};

const validateTokenManifest = (manifest: TokenManifest, issues: ValidationIssue[]) => {
  if (!manifest.manifestId) {
    addIssue(issues, "error", "Token manifest missing manifestId");
  }
  if (!manifest.createdAt) {
    addIssue(issues, "error", "Token manifest missing createdAt");
  }
  if (!manifest.sourceManifest) {
    addIssue(issues, "error", "Token manifest missing sourceManifest");
  }
  if (!Array.isArray(manifest.items)) {
    addIssue(issues, "error", "Token manifest items missing or not array");
    return;
  }

  const ids = new Set<string>();
  for (const item of manifest.items) {
    if (!item.itemId || !isItemId(item.itemId)) {
      addIssue(issues, "error", `Token item has invalid itemId: ${item.itemId}`);
    }
    if (item.itemId && ids.has(item.itemId)) {
      addIssue(issues, "error", `Duplicate token itemId: ${item.itemId}`);
    }
    if (item.itemId) {
      ids.add(item.itemId);
    }
    if (!item.sourcePortrait || hasPathTraversal(item.sourcePortrait)) {
      addIssue(issues, "error", `Token item ${item.itemId} has unsafe sourcePortrait path`);
    }
    if (!item.tokenOutput || hasPathTraversal(item.tokenOutput)) {
      addIssue(issues, "error", `Token item ${item.itemId} has unsafe tokenOutput path`);
    }

    const portraitsDir = path.resolve("tools/art-generator/output/portraits");
    const tokensDir = path.resolve("tools/art-generator/output/tokens");

    if (item.sourcePortrait && !isUnderDir(portraitsDir, item.sourcePortrait)) {
      addIssue(issues, "error", `Token item ${item.itemId} sourcePortrait not under portraits dir`);
    }
    if (item.tokenOutput && !isUnderDir(tokensDir, item.tokenOutput)) {
      addIssue(issues, "error", `Token item ${item.itemId} tokenOutput not under tokens dir`);
    }
  }
};

const crossReference = (
  portraitManifest: PortraitManifest,
  tokenManifest: TokenManifest,
  issues: ValidationIssue[]
) => {
  const portraitMap = new Map(portraitManifest.items.map((item) => [item.itemId, item]));

  for (const tokenItem of tokenManifest.items) {
    const portraitItem = portraitMap.get(tokenItem.itemId);
    if (!portraitItem) {
      addIssue(issues, "error", `Token item ${tokenItem.itemId} missing in portrait manifest`);
      continue;
    }

    const expectedPortrait = path.join(
      "tools/art-generator/output/portraits",
      portraitItem.outputs.portrait.filename
    );
    if (path.normalize(tokenItem.sourcePortrait) !== path.normalize(expectedPortrait)) {
      addIssue(issues, "error", `Token item ${tokenItem.itemId} sourcePortrait mismatch`);
    }

    const expectedToken = path.join(
      "tools/art-generator/output/tokens",
      portraitItem.outputs.token.filename
    );
    if (path.normalize(tokenItem.tokenOutput) !== path.normalize(expectedToken)) {
      addIssue(issues, "error", `Token item ${tokenItem.itemId} tokenOutput mismatch`);
    }
  }
};

const main = async () => {
  const issues: ValidationIssue[] = [];

  let portraitManifest: PortraitManifest | null = null;
  let tokenManifest: TokenManifest | null = null;

  if (portraitPath) {
    portraitManifest = await loadJsonFile<PortraitManifest>(portraitPath);
    validatePortraitManifest(portraitManifest, issues);
  }

  if (tokenPath) {
    tokenManifest = await loadJsonFile<TokenManifest>(tokenPath);
    validateTokenManifest(tokenManifest, issues);
  }

  if (portraitManifest && tokenManifest) {
    crossReference(portraitManifest, tokenManifest, issues);
  }

  if (issues.length === 0) {
    const label = portraitPath && tokenPath ? "portrait + token" : portraitPath ? "portrait" : "token";
    process.stdout.write(`OK: ${label} manifests\n`);
  }

  exitWithIssues(issues);
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
