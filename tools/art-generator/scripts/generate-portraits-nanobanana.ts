import { promises as fs } from "node:fs";
import path from "node:path";

type MonsterPrompt = {
  id: string;
  name: string;
  prompt: string;
  negativePrompt?: string;
  output?: {
    portrait?: { width?: number; height?: number; format?: "png" | "webp" };
  };
};

type ResultItem = {
  promptId: string;
  candidate: number;
  outputPath: string;
  status: "generated" | "failed" | "skipped";
  provider: string;
  message?: string;
};

const args = new Map(
  process.argv
    .slice(2)
    .map((arg, index, all) => (arg.startsWith("--") ? [arg, all[index + 1]] : null))
    .filter(Boolean) as Array<[string, string]>
);

const inputPath = args.get("--input") ?? "tools/art-generator/data/monster-prompts.drawthings.json";
const outDir = args.get("--out") ?? "tools/art-generator/output/portraits";
const resultsPath =
  args.get("--results") ?? "tools/art-generator/output/portraits/nanobanana-results.json";

const modelId = args.get("--model") ?? "gemini-3.1-flash-image-preview";
const apiKey = process.env.GEMINI_API_KEY;
const endpoint =
  args.get("--endpoint") ??
  `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey ?? ""}`;

const systemPath = args.get("--system");
const candidates = Number(args.get("--candidates") ?? "4");
const aspectRatio = args.get("--aspect") ?? "2:3";
const imageSize = args.get("--size") ?? "512";
const timeoutMs = Number(args.get("--timeout") ?? "60000");
const skipExisting = process.argv.includes("--skip-existing");

const ensureDir = async (dirPath: string) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const readPrompts = async (): Promise<MonsterPrompt[]> => {
  const raw = await fs.readFile(inputPath, "utf8");
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("Prompt file must be a JSON array");
  }
  return data as MonsterPrompt[];
};

const buildPromptText = (prompt: MonsterPrompt) => {
  if (!prompt.negativePrompt) {
    return prompt.prompt;
  }
  return `${prompt.prompt}\nNegative prompt: ${prompt.negativePrompt}`;
};

const parseResponseImages = (bodyText: string) => {
  const payloads: any[] = [];
  const trimmed = bodyText.trim();

  if (!trimmed) {
    return payloads;
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as any[];
      payloads.push(...parsed);
      return payloads;
    } catch {
      return payloads;
    }
  }

  try {
    payloads.push(JSON.parse(trimmed));
    return payloads;
  } catch {
    const lines = trimmed.split("\n");
    for (const line of lines) {
      const text = line.trim();
      if (!text || (!text.startsWith("{") && !text.startsWith("["))) {
        continue;
      }
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          payloads.push(...parsed);
        } else {
          payloads.push(parsed);
        }
      } catch {
        continue;
      }
    }
  }

  return payloads;
};

const extractImageData = (payloads: any[]) => {
  for (const payload of payloads) {
    const candidatesList = payload?.candidates ?? [];
    for (const candidate of candidatesList) {
      const parts = candidate?.content?.parts ?? [];
      for (const part of parts) {
        const inlineData = part?.inlineData;
        if (inlineData?.data) {
          return { data: inlineData.data as string, mimeType: inlineData.mimeType as string };
        }
      }
    }
  }
  return null;
};

const main = async () => {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required");
  }

  const prompts = await readPrompts();
  const results: ResultItem[] = [];

  let systemInstruction: { parts: Array<{ text: string }> } | undefined;
  if (systemPath) {
    const text = await fs.readFile(systemPath, "utf8");
    systemInstruction = { parts: [{ text }] };
  }

  await ensureDir(outDir);

  for (const prompt of prompts) {
    for (let index = 1; index <= candidates; index += 1) {
      const filename = `${prompt.id}__v${index}.png`;
      const outputPath = path.join(outDir, filename);

      if (skipExisting) {
        try {
          await fs.access(outputPath);
          results.push({
            promptId: prompt.id,
            candidate: index,
            outputPath,
            status: "skipped",
            provider: modelId,
            message: "File already exists"
          });
          continue;
        } catch {
          // continue to generate
        }
      }

      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [{ text: buildPromptText(prompt) }]
          }
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
          thinkingConfig: { thinkingLevel: "MINIMAL" },
          imageConfig: {
            aspectRatio,
            imageSize
          }
        },
        systemInstruction
      };

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          results.push({
            promptId: prompt.id,
            candidate: index,
            outputPath,
            status: "failed",
            provider: modelId,
            message: `HTTP ${response.status}: ${errorText}`
          });
          continue;
        }

        const bodyText = await response.text();
        const payloads = parseResponseImages(bodyText);
        const image = extractImageData(payloads);

        if (!image) {
          results.push({
            promptId: prompt.id,
            candidate: index,
            outputPath,
            status: "failed",
            provider: modelId,
            message: "No image data returned"
          });
          continue;
        }

        const buffer = Buffer.from(image.data, "base64");
        await fs.writeFile(outputPath, buffer);

        results.push({
          promptId: prompt.id,
          candidate: index,
          outputPath,
          status: "generated",
          provider: modelId
        });
      } catch (error) {
        results.push({
          promptId: prompt.id,
          candidate: index,
          outputPath,
          status: "failed",
          provider: modelId,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  await fs.writeFile(resultsPath, JSON.stringify({ modelId, results }, null, 2));
  const relativeOut = path.relative(process.cwd(), resultsPath);
  process.stdout.write(`Wrote ${relativeOut}\n`);
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
