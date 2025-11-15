import type { AnalysisResult } from './Analyzer.js';
import type { LoadedDocument } from './types.js';
import type { GuardRunResult } from '../services/GuardService.js';

export type IssueFormatterContext = {
  documents: LoadedDocument[];
};

export class IssueFormatter {
  format(result: AnalysisResult, context: IssueFormatterContext): GuardRunResult {
    const docCount = context.documents.length;
    const summary =
      result.summary && result.summary.trim().length > 0
        ? result.summary
        : `Document guard processed ${docCount} document(s).`;
    return {
      summary,
      issues: result.issues ?? [],
      warnings: result.warnings ?? [],
      suggestions: result.suggestions ?? []
    };
  }
}

export function createIssueFormatter(): IssueFormatter {
  return new IssueFormatter();
}
