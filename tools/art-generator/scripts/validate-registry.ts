import path from "node:path";
import {
  addIssue,
  exitWithIssues,
  hasPathTraversal,
  isSlug,
  loadJsonFile
} from "./lib/validation.ts";
import type { ValidationIssue } from "./lib/validation.ts";

type RegistryItem = {
  monsterId: string;
  portraitPath: string;
  tokenPath: string;
  generationStatus: "pending" | "generated" | "failed";
  approvalStatus: "pending" | "approved" | "rejected";
  notes?: string;
};

type AssetRegistry = {
  registryId: string;
  createdAt: string;
  source?: {
    portraitManifest: string;
    tokenManifest: string;
  };
  items: RegistryItem[];
};

const registryPath = process.argv[2] ?? "tools/art-generator/output/registry/asset-registry.json";

const main = async () => {
  const issues: ValidationIssue[] = [];
  const registry = await loadJsonFile<AssetRegistry>(registryPath);

  if (!registry.registryId) {
    addIssue(issues, "error", "Registry missing registryId");
  }
  if (!registry.createdAt) {
    addIssue(issues, "error", "Registry missing createdAt");
  }
  if (!Array.isArray(registry.items)) {
    addIssue(issues, "error", "Registry items missing or not array");
    exitWithIssues(issues);
    return;
  }

  const ids = new Set<string>();
  for (const item of registry.items) {
    if (!item.monsterId || !isSlug(item.monsterId)) {
      addIssue(issues, "error", `Registry item has invalid monsterId: ${item.monsterId}`);
    }
    if (item.monsterId && ids.has(item.monsterId)) {
      addIssue(issues, "error", `Duplicate registry monsterId: ${item.monsterId}`);
    }
    if (item.monsterId) {
      ids.add(item.monsterId);
    }

    if (!item.portraitPath || hasPathTraversal(item.portraitPath)) {
      addIssue(issues, "error", `Registry item ${item.monsterId} has unsafe portraitPath`);
    }
    if (!item.tokenPath || hasPathTraversal(item.tokenPath)) {
      addIssue(issues, "error", `Registry item ${item.monsterId} has unsafe tokenPath`);
    }

    if (!item.generationStatus) {
      addIssue(issues, "error", `Registry item ${item.monsterId} missing generationStatus`);
    }
    if (!item.approvalStatus) {
      addIssue(issues, "error", `Registry item ${item.monsterId} missing approvalStatus`);
    }
  }

  if (issues.length === 0) {
    const relPath = path.relative(process.cwd(), registryPath);
    process.stdout.write(`OK: ${relPath}\n`);
  }

  exitWithIssues(issues);
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
