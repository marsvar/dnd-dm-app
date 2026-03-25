import { promises as fs } from "node:fs";
import path from "node:path";

type PortraitManifestItem = {
  itemId: string;
  promptId: string;
  variant: number;
  status: "pending" | "generated" | "failed";
  outputs: {
    portrait: { filename: string; format: "png" | "webp" };
    token: { filename: string; format: "png" | "webp" };
  };
  artifact?: {
    portraitPath?: string;
    tokenPath?: string;
    publicPortraitPath?: string;
    publicTokenPath?: string;
  };
};

type PortraitManifest = {
  manifestId: string;
  createdAt: string;
  provider: string;
  notes?: string;
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

const defaultIn = "tools/art-generator/output/manifests/portrait-manifest.json";
const defaultOut = "tools/art-generator/output/manifests/token-manifest.json";

const args = new Map(
  process.argv
    .slice(2)
    .map((arg, index, all) => (arg.startsWith("--") ? [arg, all[index + 1]] : null))
    .filter(Boolean) as Array<[string, string]>
);

const inPath = args.get("--in") ?? defaultIn;
const outPath = args.get("--out") ?? defaultOut;

const ensureDir = async (filePath: string) => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
};

const main = async () => {
  const raw = await fs.readFile(inPath, "utf8");
  const data = JSON.parse(raw) as PortraitManifest;

  if (!Array.isArray(data.items)) {
    throw new Error("Portrait manifest missing items array");
  }

  const items: TokenManifestItem[] = data.items.map((item) => {
    const portraitFilename = item.outputs?.portrait?.filename ?? `${item.itemId}.png`;
    const tokenFilename = item.outputs?.token?.filename ?? `${item.itemId}-token.png`;

    return {
      itemId: item.itemId,
      sourcePortrait: path.join("tools/art-generator/output/portraits", portraitFilename),
      tokenOutput: path.join("tools/art-generator/output/tokens", tokenFilename),
      status: "pending"
    };
  });

  const manifest: TokenManifest = {
    manifestId: `token-${Date.now()}`,
    createdAt: new Date().toISOString(),
    sourceManifest: path.relative(process.cwd(), inPath),
    items
  };

  await ensureDir(outPath);
  await fs.writeFile(outPath, JSON.stringify(manifest, null, 2));

  const relativeOut = path.relative(process.cwd(), outPath);
  process.stdout.write(`Wrote ${relativeOut}\n`);
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
