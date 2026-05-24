export interface ExecutionLine {
  output_type: "stdout" | "stderr" | "info";
  content: string;
  timestamp: number;
}

export interface ExecutionDone {
  exit_code: number | null;
}

export interface Snippet {
  id: string;
  name: string;
  code: string;
  language: "js" | "ts";
  createdAt: string;
  updatedAt: string;
}

export interface Package {
  name: string;
  version: string;
}

export interface Settings {
  theme: "dark" | "light";
  fontSize: number;
  autoRun: boolean;
  autoRunDelay: number;
  envVars: Record<string, string>;
  nodePath: string | null;
}

export type Language = "js" | "ts";
