export type GuardServiceDependencies = Record<string, never>;

export type GuardOutputFormat = 'text' | 'json';

export type RunGuardOptions = {
  /**
   * A list of document paths that should be checked. The CLI will inject user-provided paths here.
   */
  documents: string[];
  /**
   * Preferred output format. The CLI still controls the actual rendering, but the service can
   * adjust its behavior (e.g. prompt) depending on the requested format.
   */
  format?: GuardOutputFormat;
  /**
   * Whether the caller intends to fail the command when issues are present.
   */
  failOnError?: boolean;
  /**
   * Whether the caller intends to treat issues as warnings only.
   */
  warnOnly?: boolean;
};

export type GuardFinding = {
  id: string;
  message: string;
  document?: string;
  hint?: string;
};

export type GuardRunErrorType = 'connection' | 'configuration' | 'unknown';

export type GuardRunError = {
  type: GuardRunErrorType;
  message: string;
};

export type GuardRunResult = {
  /**
   * Human readable summary. This will be printed to stdout by the CLI.
   */
  summary: string;
  /**
   * Issues detected by the analyzer pipeline. These map to exit code 2 in fail-on-error mode.
   */
  issues: GuardFinding[];
  /**
   * Warnings detected during analysis. These never fail the command by default.
   */
  warnings: GuardFinding[];
  /**
   * Suggestions returned by the analyzer/LLM.
   */
  suggestions: GuardFinding[];
  /**
   * Optional execution error. When present, the CLI should treat the run as exit code 3.
   */
  error?: GuardRunError;
};

export class GuardService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_deps: GuardServiceDependencies = {}) {}

  async run(options: RunGuardOptions): Promise<GuardRunResult> {
    const documents = normalizeDocuments(options.documents);
    const stubMode = process.env.EUTELO_GUARD_STUB_RESULT ?? 'not-implemented';
    const summaryPrefix = `Document guard placeholder processed ${documents.length} document(s).`;

    if (stubMode === 'success') {
      return {
        summary: `${summaryPrefix} No issues detected by the stub service.`,
        issues: [],
        warnings: [],
        suggestions: []
      };
    }

    if (stubMode === 'issues') {
      return {
        summary: `${summaryPrefix} Issues detected by the stub service.`,
        issues: [
          {
            id: 'ISSUE-STUB-1',
            document: documents[0],
            message: 'Stub detected a purpose conflict between PRD and BEH.'
          }
        ],
        warnings: [],
        suggestions: []
      };
    }

    if (stubMode === 'warnings') {
      return {
        summary: `${summaryPrefix} Only warnings detected by the stub service.`,
        issues: [],
        warnings: [
          {
            id: 'WARN-STUB-1',
            document: documents[0],
            message: 'Stub suggests expanding the BEH scenarios to match PRD scope.'
          }
        ],
        suggestions: []
      };
    }

    if (stubMode === 'connection-error') {
      return {
        summary: `${summaryPrefix} Failed to reach the LLM backend (stub).`,
        issues: [],
        warnings: [],
        suggestions: [],
        error: {
          type: 'connection',
          message: 'LLM connection failed in stub mode.'
        }
      };
    }

    return {
      summary: `${summaryPrefix} GuardService is not implemented yet.`,
      issues: [],
      warnings: [],
      suggestions: []
    };
  }
}

function normalizeDocuments(documents: string[]): string[] {
  if (!Array.isArray(documents)) {
    return [];
  }
  return documents
    .filter((doc) => typeof doc === 'string')
    .map((doc) => doc.trim())
    .filter((doc) => doc.length > 0);
}

export function createGuardService(dependencies: GuardServiceDependencies = {}): GuardService {
  return new GuardService(dependencies);
}
