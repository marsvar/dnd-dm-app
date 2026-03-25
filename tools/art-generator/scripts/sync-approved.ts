import { promises as fs } from "node:fs";
import path from "node:path";

type RegistryItem = {
  monsterId: string;
  portraitPath: string;
  approvalStatus: "pending" | "approved" | "rejected";
};

type AssetRegistry = {
  registryId: string;
  createdAt: string;
  items: RegistryItem[];
};

const args = new Map(
  process.argv
    .slice(2)
    .map((arg, index, all) => (arg.startsWith("--") ? [arg, all[index + 1]] : null))
    .filter(Boolean) as Array<[string, string]>
);

const registryPath =
  args.get("--registry") ?? "tools/art-generator/output/registry/asset-registry.json";
const dryRun = process.argv.includes("--dry-run");

const publicMonsters = path.join("public", "monsters");

const main = async () => {
  const raw = await fs.readFile(registryPath, "utf8");
  const registry = JSON.parse(raw) as AssetRegistry;

  if (!Array.isArray(registry.items)) {
    throw new Error("Registry items missing or not array");
  }

  await fs.mkdir(publicMonsters, { recursive: true });

  const approved = registry.items.filter((item) => item.approvalStatus === "approved");
  const seen = new Set<string>();

  for (const item of approved) {
    if (seen.has(item.monsterId)) {
      throw new Error(`Duplicate approved monsterId: ${item.monsterId}`);
    }
    seen.add(item.monsterId);

    const ext = path.extname(item.portraitPath).toLowerCase();
    const targetName = `${item.monsterId}${ext || ".png"}`;
    const targetPath = path.join(publicMonsters, targetName);

    if (dryRun) {
      process.stdout.write(`Would copy ${item.portraitPath} -> ${targetPath}\n`);
    } else {
      await fs.copyFile(item.portraitPath, targetPath);
      process.stdout.write(`Copied ${item.portraitPath} -> ${targetPath}\n`);
    }
  }
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
