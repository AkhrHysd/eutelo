import type { FileSystemAdapter } from '@eutelo/infrastructure';
import { FileSystemAdapter as DefaultFileSystemAdapter } from '@eutelo/infrastructure';
import { Analyzer } from '../guard/Analyzer.js';
import { DocumentLoader } from '../guard/DocumentLoader.js';
import type { LLMClient } from '../guard/LLMClient.js';
import { OpenAICompatibleLLMClient } from '../guard/LLMClient.js';
import { PromptBuilder } from '../guard/PromptBuilder.js';
import type { FrontmatterSchemaConfig, GuardPromptConfig, ScaffoldTemplateConfig } from '../config/types.js';

export type GuardServiceDependencies = {
  fileSystemAdapter?: FileSystemAdapter;
  llmClient?: LLMClient;
  prompts?: Record<string, GuardPromptConfig>;
  allowedFields?: string[];
  frontmatterSchemas?: FrontmatterSchemaConfig[];
  scaffold?: Record<string, ScaffoldTemplateConfig>;
};

export type GuardOutputFormat = 'text' | 'json';

export type RunGuardOptions = {
  /**
   * A list of document paths that should be checked. The CLI will inject user-provided paths here.
   */
  documents: string[];
  /**
   * Which guard prompt (from config.guard.prompts) to execute.
   */
  checkId?: string;
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
  private readonly prompts: Record<string, GuardPromptConfig>;
  private readonly hasCustomLLMClient: boolean;

  constructor(deps: GuardServiceDependencies = {}) {
    const fileSystemAdapter = deps.fileSystemAdapter ?? new DefaultFileSystemAdapter();
    this.documentLoader = new DocumentLoader({
      fileSystemAdapter,
      allowedFields: deps.allowedFields,
      frontmatterSchemas: deps.frontmatterSchemas,
      scaffold: deps.scaffold
    });
    this.promptBuilder = new PromptBuilder();
    this.analyzer = new Analyzer();
    this.prompts = deps.prompts ?? {};
    this.hasCustomLLMClient = Boolean(deps.llmClient);

    const stubMode = process.env.EUTELO_GUARD_STUB_RESULT;
    const validStubModes = ['success', 'issues', 'warnings', 'connection-error'];
    if (stubMode && validStubModes.includes(stubMode)) {
      this.llmClient = null;
    } else {
      const endpoint = process.env.EUTELO_GUARD_API_ENDPOINT;
      const apiKey = process.env.EUTELO_GUARD_API_KEY;
      const model = process.env.EUTELO_GUARD_MODEL;

      if (deps.llmClient) {
        this.llmClient = deps.llmClient;
      } else if (endpoint && apiKey) {
        this.llmClient = new OpenAICompatibleLLMClient({ endpoint, apiKey, model });
      } else {
        this.llmClient = null;
      }
    }
  }

  async run(options: RunGuardOptions): Promise<GuardRunResult> {
    const documents = normalizeDocuments(options.documents);
    const checkId = typeof options.checkId === 'string' && options.checkId.trim().length > 0 ? options.checkId.trim() : 'guard.default';
    const promptConfig = this.prompts[checkId];

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

    if (!promptConfig) {
      return {
        summary: `Guard prompt "${checkId}" is not configured.`,
        issues: [],
        warnings: [],
        suggestions: [],
        error: {
          type: 'configuration',
          message: `Missing guard prompt configuration for "${checkId}".`
        }
      };
    }

    // Check for required environment variables before proceeding
    const endpoint = process.env.EUTELO_GUARD_API_ENDPOINT;
    const apiKey = process.env.EUTELO_GUARD_API_KEY;

    if (!this.llmClient) {
      const missingVars: string[] = [];
      if (!this.hasCustomLLMClient) {
        if (!endpoint) missingVars.push('EUTELO_GUARD_API_ENDPOINT');
        if (!apiKey) missingVars.push('EUTELO_GUARD_API_KEY');
      }
      return {
        summary:
          missingVars.length > 0
            ? `Required environment variables are missing: ${missingVars.join(', ')}. Please set these environment variables to use the guard service.`
            : 'LLM client initialization failed. Please check your environment variables.',
        issues: [],
        warnings: [],
        suggestions: [],
        error: {
          type: 'configuration',
          message:
            missingVars.length > 0
              ? `Missing required environment variables: ${missingVars.join(', ')}`
              : 'LLM client could not be initialized.'
        }
      };
    }

    const debugMode = process.env.EUTELO_GUARD_DEBUG === 'true' || process.env.EUTELO_GUARD_DEBUG === '1';
    
    try {
      if (debugMode) {
        console.error('[DEBUG] Environment variables check:');
        console.error(`[DEBUG] EUTELO_GUARD_API_ENDPOINT: ${process.env.EUTELO_GUARD_API_ENDPOINT ? 'SET' : 'NOT SET'}`);
        console.error(`[DEBUG] EUTELO_GUARD_API_KEY: ${process.env.EUTELO_GUARD_API_KEY ? 'SET (' + process.env.EUTELO_GUARD_API_KEY.substring(0, 10) + '...)' : 'NOT SET'}`);
        console.error(`[DEBUG] EUTELO_GUARD_MODEL: ${process.env.EUTELO_GUARD_MODEL || 'NOT SET (using default)'}`);
      }

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

      const { systemPrompt, userPrompt } = await this.promptBuilder.buildPrompt({
        documents: loadResult.documents,
        promptConfig
      });

      const llmResponse = await this.llmClient.generate({
        prompt: userPrompt,
        systemPrompt,
        temperature: promptConfig.temperature ?? 0.3,
        model: promptConfig.model
      });

      // Note: LLM response logging is handled by CLI layer to avoid duplicate output
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
      const debugMode = process.env.EUTELO_GUARD_DEBUG === 'true' || process.env.EUTELO_GUARD_DEBUG === '1';
      
      // Log detailed error information in debug mode
      if (debugMode) {
        console.error('=== Error Details (Debug) ===');
        console.error('Error type:', typeof error);
        console.error('Error instanceof Error:', error instanceof Error);
        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        } else if (error && typeof error === 'object') {
          console.error('Error object:', JSON.stringify(error, null, 2));
        } else {
          console.error('Error value:', error);
        }
        console.error('=== End Error Details ===');
      }

      let errorMessage = 'Unknown error';
      let errorType: GuardRunErrorType = 'unknown';

      if (error && typeof error === 'object' && 'type' in error) {
        // LLMClient error
        const llmError = error as { type: string; message?: string };
        errorMessage = llmError.message || 'LLM API error';
        if (llmError.type === 'authentication') {
          errorType = 'configuration';
          errorMessage = `Authentication failed. Please verify that EUTELO_GUARD_API_KEY is correct and has the necessary permissions. ${llmError.message || ''}`;
        } else if (llmError.type === 'connection' || llmError.type === 'rate-limit') {
          errorType = 'connection';
        }
      } else if (error instanceof Error) {
        errorMessage = error.message || error.toString();
        // Check for common error types
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorType = 'connection';
          errorMessage = `Network error: ${error.message}`;
        } else if (error.name === 'SyntaxError') {
          errorType = 'connection';
          errorMessage = `JSON parse error: ${error.message}`;
        } else if (error.message.includes('timeout') || error.message.includes('aborted')) {
          errorType = 'connection';
        } else if (error.name) {
          errorMessage = `${error.name}: ${error.message}`;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        // Try to stringify the error for debugging
        try {
          errorMessage = `Unexpected error: ${JSON.stringify(error)}`;
        } catch {
          errorMessage = `Unexpected error type: ${typeof error}`;
        }
      }

      return {
        summary: `Guard execution failed: ${errorMessage}${debugMode ? ' (Check stderr for details)' : ''}`,
        issues: [],
        warnings: [],
        suggestions: [],
        error: {
          type: errorType,
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
