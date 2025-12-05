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
    basename(p: string): string;
    sep: string;
    extname(p: string): string;
    isAbsolute(p: string): boolean;
    posix: PathModule;
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
  export type Stats = {
    isDirectory(): boolean;
    isFile(): boolean;
  };
  export const promises: {
    access(path: string): Promise<void>;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    writeFile(path: string, data: string, options?: { flag?: string }): Promise<void>;
    readFile(path: string, encoding?: string): Promise<string>;
    readdir(path: string): Promise<string[]>;
    stat(path: string): Promise<Stats>;
  };
  export function existsSync(path: string): boolean;
}

declare module 'node:module' {
  export interface NodeRequire {
    (id: string): any;
    resolve(id: string): string;
  }
  export function createRequire(path: string): NodeRequire;
}

declare module 'node:url' {
  export interface FileUrl {
    href: string;
  }
  export function pathToFileURL(path: string): FileUrl;
  export function fileURLToPath(url: string | FileUrl): string;
}

declare module 'node:vm' {
  export function runInNewContext(
    code: string,
    context: Record<string, unknown>,
    options?: { filename?: string }
  ): unknown;
}

declare module 'node:process' {
  const proc: typeof process;
  export = proc;
}

declare namespace NodeJS {
  interface ErrnoException extends Error {
    code?: string;
  }
}

declare global {
  function fetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response>;

  function setTimeout(callback: () => void, delay: number): number;
  function clearTimeout(timeoutId: number): void;
  function setInterval(handler: () => void, timeout?: number): number;
  function clearInterval(identifier?: number): void;
  function setImmediate(handler: () => void): number;
  function clearImmediate(identifier?: number): void;

  interface RequestInfo {
    toString(): string;
  }

  interface RequestInit {
    method?: string;
    headers?: HeadersInit;
    body?: BodyInit | null;
    signal?: AbortSignal | null;
  }

  interface HeadersInit {
    [key: string]: string;
  }

  type BodyInit = string | Blob | ArrayBuffer | FormData;

  interface Response {
    ok: boolean;
    status: number;
    statusText: string;
    json(): Promise<unknown>;
    text(): Promise<string>;
  }

  interface AbortController {
    signal: AbortSignal;
    abort(): void;
  }

  interface AbortSignal {
    readonly aborted: boolean;
  }

  const AbortController: {
    new (): AbortController;
  };

  var Buffer: {
    from(input: string | Uint8Array, encoding?: string): Uint8Array;
  };
}
