/**
 * Types for Document Rule Validation feature
 */

export type ValidationOutputFormat = 'text' | 'json';

export type RuleValidationIssue = {
  severity: 'error' | 'warning';
  rule: string;
  message: string;
  hint?: string;
  file?: string;
  line?: number;
  column?: number;
};

export type RuleValidationResult = {
  file: string;
  issues: RuleValidationIssue[];
};

export type ValidationRunResult = {
  summary: {
    total: number;
    errors: number;
    warnings: number;
  };
  results: RuleValidationResult[];
  error?: ValidationRunError;
};

export type ValidationRunError = {
  type: 'file-not-found' | 'syntax-error' | 'configuration-error' | 'unknown';
  message: string;
  file?: string;
  line?: number;
};

export type RunValidationOptions = {
  documents: string[];
  format?: ValidationOutputFormat;
  failOnError?: boolean;
  warnOnly?: boolean;
};

export type RuleValidationServiceDependencies = {
  fileSystemAdapter?: import('@eutelo/infrastructure').FileSystemAdapter;
  cwd?: string;
  docsRoot?: string;
  config?: import('../config/types.js').EuteloConfigResolved;
};

