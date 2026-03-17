import { promises as fs } from "node:fs";
import path from "node:path";
import { PortraitProvider, PortraitRequest, PortraitResult } from "./types";

type ComfyUiJob = {
  requestId: string;
  promptId: string;
  candidate: number;
  prompt: string;
  negativePrompt?: string;
  outputPath: string;
  output: PortraitRequest["output"];
  workflowPath: string;
};

export const createComfyUiProvider = (workflowPath: string): PortraitProvider => {
  const providerId = "comfyui-local";

  const generatePortraits = async (
    requests: PortraitRequest[],
    options: { workDir: string }
  ): Promise<PortraitResult[]> => {
    const requestsDir = path.join(options.workDir, "tools", "art-generator", "output", "requests");
    await fs.mkdir(requestsDir, { recursive: true });

    const jobFile = path.join(requestsDir, "comfyui-portrait-requests.json");
    const jobs: ComfyUiJob[] = requests.map((request) => ({
      requestId: request.requestId,
      promptId: request.promptId,
      candidate: request.candidate,
      prompt: request.prompt,
      negativePrompt: request.negativePrompt,
      outputPath: request.outputPath,
      output: request.output,
      workflowPath
    }));

    await fs.writeFile(jobFile, JSON.stringify({ provider: providerId, jobs }, null, 2));

    return requests.map((request) => ({
      requestId: request.requestId,
      promptId: request.promptId,
      candidate: request.candidate,
      outputPath: request.outputPath,
      status: "queued",
      provider: providerId,
      requestFile: path.relative(process.cwd(), jobFile)
    }));
  };

  return {
    id: providerId,
    generatePortraits
  };
};
