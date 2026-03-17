import { promises as fs } from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

const allowedExtensions = new Set([".png", ".webp"]);

const copyDir = async (sourceDir: string, targetDir: string) => {
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (entry.name.startsWith(".")) {
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!allowedExtensions.has(ext)) {
      continue;
    }
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (dryRun) {
      process.stdout.write(`Would copy ${sourcePath} -> ${targetPath}\n`);
    } else {
      await fs.copyFile(sourcePath, targetPath);
      process.stdout.write(`Copied ${sourcePath} -> ${targetPath}\n`);
    }
  }
};

const main = async () => {
  const portraitsDir = path.join("tools", "art-generator", "output", "portraits");
  const tokensDir = path.join("tools", "art-generator", "output", "tokens");

  const publicMonsters = path.join("public", "monsters");
  const publicTokens = path.join("public", "tokens");

  await copyDir(portraitsDir, publicMonsters);
  await copyDir(tokensDir, publicTokens);
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
