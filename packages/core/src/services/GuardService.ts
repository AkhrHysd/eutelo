import type { DocumentLoader } from '../guard/DocumentLoader.js';
import type { PromptBuilder } from '../guard/PromptBuilder.js';
import type { LLMClient } from '../guard/LLMClient.js';
import type { Analyzer } from '../guard/Analyzer.js';
import type { IssueFormatter } from '../guard/IssueFormatter.js';
import type { LoadedDocument, PromptIntent } from '../guard/types.js';
import { DocumentLoaderError } from '../guard/DocumentLoader.js';
import { LLMClientError } from '../guard/errors.js';
import { createDocumentLoader } from '../guard/DocumentLoader.js';
import { createPromptBuilder } from '../guard/PromptBuilder.js';
import { createAnalyzer } from '../guard/Analyzer.js';
import { createIssueFormatter } from '../guard/IssueFormatter.js';
import { FakeLLMClient, OpenAICompatibleLLMClient } from '../guard/LLMClient.js';

export type GuardServiceDependencies = {
  documentLoader: DocumentLoader;
  promptBuilder: PromptBuilder;
  llmClient: LLMClient;
  analyzer: Analyzer;
  issueFormatter: IssueFormatter;
  environment?: GuardEnvironment;
  model?: string;
  temperature?: number;
};

type GuardEnvironment = Record<string, string | undefined>;

export type GuardOutputFormat = 'text' | 'json';

export type RunGuardOptions = {
  /**
   * A list of document paths that should be checked. The CLI will inject user-provided paths here.
   */
  documents: string[];
  /**
   * Current working directory. Defaults to process.cwd().
   */
  cwd?: string;
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
  private readonly llmClient: LLMClient;
  private readonly analyzer: Analyzer;
  private readonly issueFormatter: IssueFormatter;
  private readonly environment: GuardEnvironment;
  private readonly model?: string;
  private readonly temperature?: number;

  constructor(dependencies: GuardServiceDependencies) {
    this.documentLoader = dependencies.documentLoader;
    this.promptBuilder = dependencies.promptBuilder;
    this.llmClient = dependencies.llmClient;
    this.analyzer = dependencies.analyzer;
    this.issueFormatter = dependencies.issueFormatter;
    this.environment = dependencies.environment ?? process.env;
    this.model = dependencies.model ?? this.environment.EUTELO_GUARD_MODEL;
    this.temperature =
      typeof dependencies.temperature === 'number' ? dependencies.temperature : undefined;
  }

  async run(options: RunGuardOptions): Promise<GuardRunResult> {
    const documents = normalizeDocuments(options.documents);
    if (documents.length === 0) {
      return noopResult('No documents were provided for guard checks.');
    }
    const cwd = options.cwd ?? process.cwd();
    let loadedDocs: LoadedDocument[];
    try {
      loadedDocs = await this.documentLoader.loadDocuments({ cwd, paths: documents });
    } catch (error) {
      return this.handleDocumentLoaderError(error);
    }
    if (loadedDocs.length === 0) {
      return noopResult('No valid documents were found for guard checks.');
    }
    const intent: PromptIntent = {
      format: options.format,
      warnOnly: options.warnOnly,
      failOnError: options.failOnError
    };
    const prompt = this.promptBuilder.build({
      documents: loadedDocs,
      intent
    });
    try {
      const response = await this.llmClient.generate({
        prompt: prompt.userPrompt,
        systemPrompt: prompt.systemPrompt,
        model: this.model,
        temperature: this.temperature
      });
      const analysis = this.analyzer.analyze(response.content);
      return this.issueFormatter.format(analysis, { documents: loadedDocs });
    } catch (error) {
      return this.handleLLMError(error);
    }
  }

  private handleDocumentLoaderError(error: unknown): GuardRunResult {
    if (!isLoaderError(error)) {
      return {
        summary: 'Unknown document loading error.',
        issues: [],
        warnings: [],
        suggestions: [],
        error: {
          type: 'unknown',
          message: error instanceof Error ? error.message : 'Unknown error.'
        }
      };
    }
    return {
      summary: `Failed to load documents: ${error.message}`,
      issues: [],
      warnings: [],
      suggestions: [],
      error: {
        type: 'configuration',
        message: error.message
      }
    };
  }

  private handleLLMError(error: unknown): GuardRunResult {
    if (!isLLMError(error)) {
      return {
        summary: 'Unexpected LLM failure.',
        issues: [],
        warnings: [],
        suggestions: [],
        error: {
          type: 'unknown',
          message: error instanceof Error ? error.message : 'Unknown error.'
        }
      };
    }
    return {
      summary: 'Document guard could not complete due to an LLM error.',
      issues: [],
      warnings: [],
      suggestions: [],
      error: {
        type: error.reason === 'configuration' ? 'configuration' : 'connection',
        message: error.message
      }
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

function noopResult(summary: string): GuardRunResult {
  return {
    summary,
    issues: [],
    warnings: [],
    suggestions: []
  };
}

function isLoaderError(error: unknown): error is DocumentLoaderError {
  return error instanceof DocumentLoaderError;
}

function isLLMError(error: unknown): error is LLMClientError {
  return error instanceof LLMClientError;
}

export function createGuardService(dependencies: Partial<GuardServiceDependencies> & {
  fileSystemAdapter?: { readFile(targetPath: string): Promise<string> };
  environment?: GuardEnvironment;
} = {}): GuardService {
  const env = dependencies.environment ?? process.env;
  let documentLoader = dependencies.documentLoader;
  if (!documentLoader) {
    const fileSystemAdapter = dependencies.fileSystemAdapter;
    if (!fileSystemAdapter) {
      throw new Error('fileSystemAdapter is required to create GuardService.');
    }
    documentLoader = createDocumentLoader({
      fileSystemAdapter
    });
  }
  const promptBuilder = dependencies.promptBuilder ?? createPromptBuilder();
  const analyzer = dependencies.analyzer ?? createAnalyzer();
  const issueFormatter = dependencies.issueFormatter ?? createIssueFormatter();
  let llmClient = dependencies.llmClient;
  if (!llmClient) {
    const stubMode = env?.EUTELO_GUARD_STUB_RESULT;
    if (stubMode) {
      llmClient = new FakeLLMClient(() => Promise.resolve(renderStubPayload(stubMode)));
    } else {
      llmClient = new OpenAICompatibleLLMClient({
        apiKey: env?.EUTELO_GUARD_API_KEY,
        endpoint: env?.EUTELO_GUARD_API_ENDPOINT,
        defaultModel: env?.EUTELO_GUARD_MODEL
      });
    }
  }
  return new GuardService({
    documentLoader,
    promptBuilder,
    llmClient,
    analyzer,
    issueFormatter,
    environment: env,
    model: dependencies.model,
    temperature: dependencies.temperature
  });
}

function renderStubPayload(mode: string): string {
  const summary = 'Stubbed guard evaluation';
  if (mode === 'issues') {
    return JSON.stringify({
      summary,
      issues: [
        {
          id: 'ISSUE-STUB-1',
          document: 'PRD-DOCS.md',
          message: 'Purpose conflict detected.'
        }
      ],
      warnings: [],
      suggestions: []
    });
  }
  if (mode === 'warnings') {
    return JSON.stringify({
      summary,
      issues: [],
      warnings: [
        { id: 'WARN-STUB-1', message: 'Scope coverage may need more scenarios.' }
      ],
      suggestions: []
    });
  }
  if (mode === 'success') {
    return JSON.stringify({
      summary: `${summary}: no issues detected.`,
      issues: [],
      warnings: [],
      suggestions: []
    });
  }
  if (mode === 'connection-error') {
    throw new LLMClientError('LLM connection failed in stub mode.', 'connection');
  }
  return JSON.stringify({
    summary: `${summary}: not implemented.`,
    issues: [],
    warnings: [],
    suggestions: []
  });
}
