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
  /**
   * Raw LLM response (only included if debug mode is enabled or format is json with debug flag).
   */
  llmResponse?: string;
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

    // Check for required environment variables before proceeding
    const endpoint = process.env.EUTELO_GUARD_API_ENDPOINT;
    const apiKey = process.env.EUTELO_GUARD_API_KEY;

    if (!endpoint || !apiKey) {
      const missingVars: string[] = [];
      if (!endpoint) missingVars.push('EUTELO_GUARD_API_ENDPOINT');
      if (!apiKey) missingVars.push('EUTELO_GUARD_API_KEY');

      return {
        summary: `Required environment variables are missing: ${missingVars.join(', ')}. Please set these environment variables to use the guard service.`,
        issues: [],
        warnings: [],
        suggestions: [],
        error: {
          type: 'configuration',
          message: `Missing required environment variables: ${missingVars.join(', ')}`
        }
      };
    }

    if (!this.llmClient) {
      return {
        summary: 'LLM client initialization failed. Please check your environment variables.',
        issues: [],
        warnings: [],
        suggestions: [],
        error: {
          type: 'configuration',
          message: 'LLM client could not be initialized.'
        }
      };
    }

    try {
      const loadResult = await this.documentLoader.loadDocuments(documents);
      
      // If there are errors but we have some valid documents, continue with warnings
      if (loadResult.errors.length > 0 && loadResult.documents.length === 0) {
        const errorMessages = loadResult.errors.map((e) => `${e.path}: ${e.message}`).join('; ');
        return {
          summary: `Failed to load all documents: ${errorMessages}`,
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
        const totalPaths = documents.length;
        const skippedCount = loadResult.errors.length;
        const skippedFiles = loadResult.errors.map((e) => e.path).join(', ');
        
        let summary = `No valid documents found to check.`;
        summary += `\n  Total paths provided: ${totalPaths}`;
        if (skippedCount > 0) {
          summary += `\n  Files skipped: ${skippedCount}`;
          if (skippedFiles) {
            summary += `\n  Skipped files: ${skippedFiles}`;
          }
        }
        summary += `\n  Valid documents loaded: 0`;
        summary += `\n\nPossible reasons:`;
        summary += `\n  - All files were skipped (README.md, templates, or philosophy files)`;
        summary += `\n  - Files do not have valid frontmatter with required fields (id, type, etc.)`;
        summary += `\n  - Files do not match expected document types (PRD, BEH, DSG, ADR, TASK, OPS)`;
        
        return {
          summary,
          issues: [],
          warnings: loadResult.errors.length > 0 
            ? loadResult.errors.map((e) => ({
                id: `LOAD-WARN-${e.path}`,
                message: `Skipped: ${e.path} - ${e.message}`,
                document: e.path
              }))
            : [],
          suggestions: []
        };
      }

      // If there are errors but we have valid documents, add warnings but continue
      const loadWarnings: GuardFinding[] = [];
      if (loadResult.errors.length > 0) {
        loadWarnings.push(
          ...loadResult.errors.map((e) => ({
            id: `LOAD-WARN-${e.path}`,
            message: `Skipped document: ${e.path} - ${e.message}`,
            document: e.path
          }))
        );
      }

      const { systemPrompt, userPrompt } = this.promptBuilder.buildPrompt({
        documents: loadResult.documents
      });

      const llmResponse = await this.llmClient.generate({
        prompt: userPrompt,
        systemPrompt,
        temperature: 0.3
      });

      // Check if debug mode is enabled
      const debugMode = process.env.EUTELO_GUARD_DEBUG === 'true' || process.env.EUTELO_GUARD_DEBUG === '1';
      
      // Log LLM response to stderr if debug mode is enabled
      if (debugMode) {
        console.error('=== LLM Response (Debug) ===');
        console.error(llmResponse.content);
        console.error('=== End LLM Response ===');
      }

      const analysisResult = this.analyzer.analyze(llmResponse.content);

      // Combine load warnings with analysis warnings
      const allWarnings = [...loadWarnings, ...analysisResult.warnings];

      const issueCount = analysisResult.issues.length;
      const warningCount = allWarnings.length;
      const suggestionCount = analysisResult.suggestions.length;

      let summary = `Analyzed ${loadResult.documents.length} document(s).`;
      if (loadResult.errors.length > 0) {
        summary += ` Skipped ${loadResult.errors.length} file(s).`;
      }
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
        warnings: allWarnings,
        suggestions: analysisResult.suggestions,
        llmResponse: debugMode ? llmResponse.content : undefined
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
