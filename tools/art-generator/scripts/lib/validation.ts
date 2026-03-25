import { promises as fs } from "node:fs";
import path from "node:path";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const itemIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:-v[1-9][0-9]*)?$/;
const filenamePattern = /^[a-z0-9][a-z0-9._-]*\.(png|webp)$/;

export type ValidationIssue = {
  level: "error" | "warning";
  message: string;
};

export const loadJsonFile = async <T>(filePath: string): Promise<T> => {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
};

export const isSlug = (value: string) => slugPattern.test(value);
export const isItemId = (value: string) => itemIdPattern.test(value);
export const isSafeFilename = (value: string) => filenamePattern.test(value);

export const addIssue = (
  issues: ValidationIssue[],
  level: ValidationIssue["level"],
  message: string
) => {
  issues.push({ level, message });
};

export const hasPathTraversal = (value: string) => {
  return value.includes("..") || value.includes("\\") || value.startsWith("/");
};

export const isUnderDir = (baseDir: string, targetPath: string) => {
  const normalizedBase = path.resolve(baseDir) + path.sep;
  const normalizedTarget = path.resolve(targetPath);
  return normalizedTarget.startsWith(normalizedBase);
};

export const exitWithIssues = (issues: ValidationIssue[]) => {
  for (const issue of issues) {
    const prefix = issue.level === "error" ? "ERROR" : "WARN";
    process.stdout.write(`${prefix}: ${issue.message}\n`);
  }

  if (issues.some((issue) => issue.level === "error")) {
    process.exit(1);
  }
};
