import type { FileSystemAdapter } from '@eutelo/infrastructure';
import { FileSystemAdapter as DefaultFileSystemAdapter } from '@eutelo/infrastructure';
import { Analyzer } from '../guard/Analyzer.js';
import { DocumentLoader } from '../guard/DocumentLoader.js';
import type { LLMClient } from '../guard/LLMClient.js';
import { OpenAICompatibleLLMClient } from '../guard/LLMClient.js';
import { PromptBuilder } from '../guard/PromptBuilder.js';

export type GuardServiceDependencies = {
  fileSystemAdapter?: FileSystemAdapter;
  llmClient?: LLMClient;
};

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
  private readonly documentLoader: DocumentLoader;
  private readonly promptBuilder: PromptBuilder;
  private readonly analyzer: Analyzer;
  private readonly llmClient: LLMClient | null;

  constructor(deps: GuardServiceDependencies = {}) {
    const fileSystemAdapter = deps.fileSystemAdapter ?? new DefaultFileSystemAdapter();
    this.documentLoader = new DocumentLoader({ fileSystemAdapter });
    this.promptBuilder = new PromptBuilder();
    this.analyzer = new Analyzer();

    const stubMode = process.env.EUTELO_GUARD_STUB_RESULT;
    const validStubModes = ['success', 'issues', 'warnings', 'connection-error'];
    if (stubMode && validStubModes.includes(stubMode)) {
      this.llmClient = null;
    } else {
      const endpoint = process.env.EUTELO_GUARD_API_ENDPOINT;
      const apiKey = process.env.EUTELO_GUARD_API_KEY;
      const model = process.env.EUTELO_GUARD_MODEL;

      if (endpoint && apiKey) {
        this.llmClient = deps.llmClient ?? new OpenAICompatibleLLMClient({ endpoint, apiKey, model });
      } else {
        this.llmClient = null;
      }
    }
  }

  async run(options: RunGuardOptions): Promise<GuardRunResult> {
    const documents = normalizeDocuments(options.documents);

    if (documents.length === 0) {
      return {
        summary: 'No documents to check.',
        issues: [],
        warnings: [],
        suggestions: []
      };
    }

    const stubMode = process.env.EUTELO_GUARD_STUB_RESULT;
    const validStubModes = ['success', 'issues', 'warnings', 'connection-error'];
    if (stubMode && validStubModes.includes(stubMode)) {
      return this.runStubMode(documents, stubMode);
    }

    if (!this.llmClient) {
      const endpoint = process.env.EUTELO_GUARD_API_ENDPOINT;
      const apiKey = process.env.EUTELO_GUARD_API_KEY;

      if (!endpoint || !apiKey) {
        return {
          summary: 'API endpoint or API key is missing. Please set EUTELO_GUARD_API_ENDPOINT and EUTELO_GUARD_API_KEY environment variables.',
          issues: [],
          warnings: [],
          suggestions: [],
          error: {
            type: 'configuration',
            message: 'API endpoint or API key is missing.'
          }
        };
      }
    }

    try {
      const loadResult = await this.documentLoader.loadDocuments(documents);
      if (loadResult.errors.length > 0) {
        const errorMessages = loadResult.errors.map((e) => `${e.path}: ${e.message}`).join('; ');
        return {
          summary: `Failed to load some documents: ${errorMessages}`,
          issues: [],
          warnings: [],
          suggestions: [],
          error: {
            type: 'configuration',
            message: `Document loading errors: ${errorMessages}`
          }
        };
      }

      if (loadResult.documents.length === 0) {
        return {
          summary: 'No valid documents found to check.',
          issues: [],
          warnings: [],
          suggestions: []
        };
      }

      if (!this.llmClient) {
        return {
          summary: 'LLM client is not available.',
          issues: [],
          warnings: [],
          suggestions: [],
          error: {
            type: 'configuration',
            message: 'LLM client is not configured.'
          }
        };
      }

      const { systemPrompt, userPrompt } = this.promptBuilder.buildPrompt({
        documents: loadResult.documents
      });

      const llmResponse = await this.llmClient.generate({
        prompt: userPrompt,
        systemPrompt,
        temperature: 0.3
      });

      const analysisResult = this.analyzer.analyze(llmResponse.content);

      const issueCount = analysisResult.issues.length;
      const warningCount = analysisResult.warnings.length;
      const suggestionCount = analysisResult.suggestions.length;

      let summary = `Analyzed ${loadResult.documents.length} document(s).`;
      if (issueCount > 0) {
        summary += ` Found ${issueCount} issue(s).`;
      }
      if (warningCount > 0) {
        summary += ` Found ${warningCount} warning(s).`;
      }
      if (suggestionCount > 0) {
        summary += ` Found ${suggestionCount} suggestion(s).`;
      }
      if (issueCount === 0 && warningCount === 0 && suggestionCount === 0) {
        summary += ' No issues detected.';
      }

      return {
        summary,
        issues: analysisResult.issues,
        warnings: analysisResult.warnings,
        suggestions: analysisResult.suggestions
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isLLMError = error && typeof error === 'object' && 'type' in error;

      return {
        summary: `Guard execution failed: ${errorMessage}`,
        issues: [],
        warnings: [],
        suggestions: [],
        error: isLLMError
          ? {
              type: (error as { type: string }).type === 'authentication' ? 'configuration' : 'connection',
              message: errorMessage
            }
          : {
              type: 'unknown',
              message: errorMessage
            }
      };
    }
  }

  private runStubMode(documents: string[], stubMode: string): GuardRunResult {
    const summaryPrefix = `Document guard placeholder processed ${documents.length} document(s).`;

    switch (stubMode) {
      case 'success':
        return {
          summary: `${summaryPrefix} No issues detected by the stub service.`,
          issues: [],
          warnings: [],
          suggestions: []
        };

      case 'issues':
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

      case 'warnings':
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

      case 'connection-error':
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

      default:
        return {
          summary: `${summaryPrefix} Unknown stub mode: ${stubMode}.`,
          issues: [],
          warnings: [],
          suggestions: []
        };
    }
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
