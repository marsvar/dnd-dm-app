import { promises as fs } from "node:fs";
import path from "node:path";
import { addIssue, exitWithIssues, loadJsonFile } from "./lib/validation.ts";
import type { ValidationIssue } from "./lib/validation.ts";

type RegistryItem = {
  monsterId: string;
  portraitPath: string;
  tokenPath: string;
  generationStatus: "pending" | "generated" | "failed";
  approvalStatus: "pending" | "approved" | "rejected";
  approvedAt?: string;
  reviewNote?: string;
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

const args = new Map(
  process.argv
    .slice(2)
    .map((arg, index, all) => (arg.startsWith("--") ? [arg, all[index + 1]] : null))
    .filter(Boolean) as Array<[string, string]>
);

const registryPath = args.get("--registry") ?? "tools/art-generator/output/registry/asset-registry.json";
const status = args.get("--status");
const reason = args.get("--reason");
const id = args.get("--id");
const idsRaw = args.get("--ids");

const parseIds = () => {
  const ids: string[] = [];
  if (id) {
    ids.push(id);
  }
  if (idsRaw) {
    ids.push(...idsRaw.split(",").map((value) => value.trim()).filter(Boolean));
  }
  return Array.from(new Set(ids));
};

const main = async () => {
  const issues: ValidationIssue[] = [];
  const ids = parseIds();

  if (ids.length === 0) {
    addIssue(issues, "error", "Provide at least one --id or --ids value");
  }
  if (!status || (status !== "approved" && status !== "rejected")) {
    addIssue(issues, "error", "--status must be approved or rejected");
  }

  if (issues.length > 0) {
    exitWithIssues(issues);
    return;
  }

  const registry = await loadJsonFile<AssetRegistry>(registryPath);
  if (!Array.isArray(registry.items)) {
    addIssue(issues, "error", "Registry items missing or not array");
    exitWithIssues(issues);
    return;
  }

  let updated = 0;
  const now = new Date().toISOString();

  registry.items = registry.items.map((item) => {
    if (!ids.includes(item.monsterId)) {
      return item;
    }

    updated += 1;
    return {
      ...item,
      approvalStatus: status as "approved" | "rejected",
      approvedAt: status === "approved" ? now : item.approvedAt,
      reviewNote: reason ? reason : item.reviewNote
    };
  });

  if (updated === 0) {
    addIssue(issues, "warning", "No matching monsterId values found in registry");
  }

  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));

  const relPath = path.relative(process.cwd(), registryPath);
  process.stdout.write(`Updated ${updated} item(s) in ${relPath}\n`);
  exitWithIssues(issues);
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
