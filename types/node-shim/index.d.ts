// Minimal Node.js shims to enable TypeScript compilation without @types/node.
declare const process: {
  argv: string[];
  cwd(): string;
  stdout: { write(chunk: string): void };
  stderr: { write(chunk: string): void };
  exitCode?: number;
  env: Record<string, string | undefined>;
};

interface ImportMeta {
  url: string;
}

declare module 'node:path' {
  interface PathModule {
    resolve(...segments: string[]): string;
    relative(from: string, to: string): string;
    join(...segments: string[]): string;
    dirname(p: string): string;
  }
  const path: PathModule;
  export default path;
}

declare module 'node:util' {
  export interface ParseArgsOptionConfig {
    type: 'boolean' | 'string';
    default?: boolean | string;
  }
  export interface ParseArgsConfig {
    args?: string[];
    options?: Record<string, ParseArgsOptionConfig>;
    allowPositionals?: boolean;
  }
  export interface ParseArgsResult {
    values: Record<string, unknown>;
    positionals: string[];
  }
  export function parseArgs(config?: ParseArgsConfig): ParseArgsResult;
}

declare module 'node:fs/promises' {
  export function access(path: string): Promise<void>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function writeFile(path: string, data: string, options?: { flag?: string }): Promise<void>;
  export function readFile(path: string, encoding?: string): Promise<string>;
  export function readdir(path: string): Promise<string[]>;
}

declare module 'node:fs' {
  export const promises: {
    access(path: string): Promise<void>;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    writeFile(path: string, data: string, options?: { flag?: string }): Promise<void>;
    readFile(path: string, encoding?: string): Promise<string>;
    readdir(path: string): Promise<string[]>;
  };
}

declare module 'node:module' {
  export function createRequire(path: string): { resolve(id: string): string };
}

declare module 'node:process' {
  const proc: typeof process;
  export = proc;
}
