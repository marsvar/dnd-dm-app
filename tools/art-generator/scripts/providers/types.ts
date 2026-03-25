export type PortraitPrompt = {
  promptId: string;
  name: string;
  prompt: string;
  negativePrompt?: string;
  output: {
    width: number;
    height: number;
    format: "png" | "webp";
  };
};

export type PortraitRequest = {
  requestId: string;
  promptId: string;
  candidate: number;
  prompt: string;
  negativePrompt?: string;
  outputPath: string;
  output: PortraitPrompt["output"];
  workflowPath: string;
};

export type PortraitResult = {
  requestId: string;
  promptId: string;
  candidate: number;
  outputPath: string;
  status: "queued" | "generated" | "failed";
  provider: string;
  requestFile?: string;
  message?: string;
};

export type PortraitProvider = {
  id: string;
  generatePortraits: (
    requests: PortraitRequest[],
    options: { workDir: string }
  ) => Promise<PortraitResult[]>;
};
