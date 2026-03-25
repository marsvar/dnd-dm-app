import path from "node:path";
import { promises as fs } from "node:fs";
import { addIssue, exitWithIssues, loadJsonFile } from "./lib/validation.ts";
import type { ValidationIssue } from "./lib/validation.ts";

type PortraitManifestItem = {
  itemId: string;
  promptId: string;
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
  tokenOutput: string;
  status: "pending" | "generated" | "failed";
};

type TokenManifest = {
  manifestId: string;
  createdAt: string;
  sourceManifest: string;
  items: TokenManifestItem[];
};

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
  source: {
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

const portraitPath = args.get("--portrait") ?? "tools/art-generator/output/manifests/portrait-manifest.json";
const tokenPath = args.get("--token") ?? "tools/art-generator/output/manifests/token-manifest.json";
const outPath = args.get("--out") ?? "tools/art-generator/output/registry/asset-registry.json";

const ensureDir = async (filePath: string) => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
};

const main = async () => {
  const issues: ValidationIssue[] = [];
  const portrait = await loadJsonFile<PortraitManifest>(portraitPath);
  const token = await loadJsonFile<TokenManifest>(tokenPath);

  if (!Array.isArray(portrait.items)) {
    addIssue(issues, "error", "Portrait manifest items missing or not array");
  }
  if (!Array.isArray(token.items)) {
    addIssue(issues, "error", "Token manifest items missing or not array");
  }

  if (issues.length > 0) {
    exitWithIssues(issues);
    return;
  }

  const tokenMap = new Map(token.items.map((item) => [item.itemId, item]));
  const items: RegistryItem[] = portrait.items.map((item) => {
    const tokenItem = tokenMap.get(item.itemId);
    const tokenPathValue = tokenItem?.tokenOutput ?? path.join("tools/art-generator/output/tokens", item.outputs.token.filename);

    const generationStatus =
      item.status === "failed" || tokenItem?.status === "failed"
        ? "failed"
        : item.status === "generated" && tokenItem?.status === "generated"
          ? "generated"
          : "pending";

    return {
      monsterId: item.itemId,
      portraitPath: path.join("tools/art-generator/output/portraits", item.outputs.portrait.filename),
      tokenPath: tokenPathValue,
      generationStatus,
      approvalStatus: "pending"
    };
  });

  const registry: AssetRegistry = {
    registryId: `registry-${Date.now()}`,
    createdAt: new Date().toISOString(),
    source: {
      portraitManifest: path.relative(process.cwd(), portraitPath),
      tokenManifest: path.relative(process.cwd(), tokenPath)
    },
    items
  };

  await ensureDir(outPath);
  await fs.writeFile(outPath, JSON.stringify(registry, null, 2));

  const relativeOut = path.relative(process.cwd(), outPath);
  process.stdout.write(`Wrote ${relativeOut}\n`);
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
