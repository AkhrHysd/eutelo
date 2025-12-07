/**
 * LLMValidator - Validates documents using LLM
 */

import type { LLMClient } from '../guard/LLMClient.js';
import { OpenAICompatibleLLMClient } from '../guard/LLMClient.js';
import { Analyzer } from '../guard/Analyzer.js';
import type { RuleValidationIssue } from './types.js';

export type LLMValidatorOptions = {
  llmClient?: LLMClient;
  model?: string;
  temperature?: number;
};

export type LLMValidationResult = {
  issues: RuleValidationIssue[];
  warnings: RuleValidationIssue[];
  suggestions: RuleValidationIssue[];
};

export class LLMValidator {
  private readonly llmClient: LLMClient | null;
  private readonly defaultModel: string;
  private readonly defaultTemperature: number;
  private readonly analyzer: Analyzer;

  constructor(options: LLMValidatorOptions = {}) {
    this.llmClient = options.llmClient ?? this.createDefaultLLMClient();
    this.defaultModel = options.model || 'gpt-4o-mini';
    this.defaultTemperature = options.temperature ?? 0.2;
    this.analyzer = new Analyzer();
  }

  /**
   * Validate document using LLM
   */
  async validate(prompt: string, model?: string, temperature?: number): Promise<LLMValidationResult> {
    // Check for stub mode (for testing)
    const stubMode = process.env.EUTELO_VALIDATE_STUB_RESULT;
    if (stubMode) {
      return this.runStubMode(stubMode);
    }

    if (!this.llmClient) {
      throw new Error('LLM client is not available. Please set EUTELO_GUARD_API_ENDPOINT and EUTELO_GUARD_API_KEY environment variables.');
    }

    const effectiveModel = model || this.defaultModel;
    const effectiveTemperature = temperature ?? this.defaultTemperature;

    try {
      const response = await this.llmClient.generate({
        prompt,
        model: effectiveModel,
        temperature: effectiveTemperature
      });

      // Parse LLM response
      const analysis = this.analyzer.analyze(response.content);

      // Convert GuardFinding to RuleValidationIssue
      const issues: RuleValidationIssue[] = analysis.issues.map(finding => ({
        severity: 'error',
        rule: finding.id || 'LLM-VALIDATION',
        message: finding.message,
        hint: finding.document
      }));

      const warnings: RuleValidationIssue[] = analysis.warnings.map(finding => ({
        severity: 'warning',
        rule: finding.id || 'LLM-VALIDATION',
        message: finding.message,
        hint: finding.document
      }));

      const suggestions: RuleValidationIssue[] = analysis.suggestions.map(finding => ({
        severity: 'warning',
        rule: finding.id || 'LLM-SUGGESTION',
        message: finding.message,
        hint: finding.document
      }));

      return { issues, warnings, suggestions };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`LLM validation failed: ${errorMessage}`);
    }
  }

  /**
   * Create default LLM client from environment variables
   */
  private createDefaultLLMClient(): LLMClient | null {
    const endpoint = process.env.EUTELO_GUARD_API_ENDPOINT;
    const apiKey = process.env.EUTELO_GUARD_API_KEY;

    if (!endpoint || !apiKey) {
      return null;
    }

    return new OpenAICompatibleLLMClient({
      endpoint,
      apiKey
    });
  }

  /**
   * Run stub mode for testing
   */
  private runStubMode(stubMode: string): LLMValidationResult {
    const validStubModes = ['success', 'issues', 'warnings', 'connection-error'];
    if (!validStubModes.includes(stubMode)) {
      throw new Error(`Invalid stub mode: ${stubMode}. Valid modes: ${validStubModes.join(', ')}`);
    }

    switch (stubMode) {
      case 'success':
        return {
          issues: [],
          warnings: [],
          suggestions: []
        };
      
      case 'issues':
        return {
          issues: [{
            severity: 'error',
            rule: 'TEST-RULE',
            message: 'Test validation issue: purpose field is missing',
            hint: 'Add purpose field to frontmatter'
          }],
          warnings: [],
          suggestions: []
        };
      
      case 'warnings':
        return {
          issues: [],
          warnings: [{
            severity: 'warning',
            rule: 'TEST-WARNING',
            message: 'Test validation warning'
          }],
          suggestions: []
        };
      
      case 'connection-error':
        throw new Error('LLM connection error (stub mode)');
      
      default:
        throw new Error(`Unknown stub mode: ${stubMode}`);
    }
  }
}

