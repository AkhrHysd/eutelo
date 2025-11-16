import type { GuardFinding } from '../services/GuardService.js';

export type AnalyzerResult = {
  issues: GuardFinding[];
  warnings: GuardFinding[];
  suggestions: GuardFinding[];
};

export class Analyzer {
  analyze(llmResponse: string): AnalyzerResult {
    const issues: GuardFinding[] = [];
    const warnings: GuardFinding[] = [];
    const suggestions: GuardFinding[] = [];

    try {
      const parsed = this.parseJSONResponse(llmResponse);
      if (parsed) {
        issues.push(...this.normalizeFindings(parsed.issues || [], 'issue'));
        warnings.push(...this.normalizeFindings(parsed.warnings || [], 'warning'));
        suggestions.push(...this.normalizeFindings(parsed.suggestions || [], 'suggestion'));
      } else {
        const textAnalysis = this.analyzeTextResponse(llmResponse);
        issues.push(...textAnalysis.issues);
        warnings.push(...textAnalysis.warnings);
        suggestions.push(...textAnalysis.suggestions);
      }
    } catch (error) {
      warnings.push({
        id: 'ANALYZER-PARSE-ERROR',
        message: `Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}. Treating as text analysis.`
      });
      const textAnalysis = this.analyzeTextResponse(llmResponse);
      issues.push(...textAnalysis.issues);
      warnings.push(...textAnalysis.warnings);
      suggestions.push(...textAnalysis.suggestions);
    }

    return { issues, warnings, suggestions };
  }

  private parseJSONResponse(response: string): {
    issues?: Array<{ id?: string; document?: string; message?: string; type?: string }>;
    warnings?: Array<{ id?: string; document?: string; message?: string }>;
    suggestions?: Array<{ id?: string; document?: string; message?: string }>;
  } | null {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  private normalizeFindings(
    findings: Array<{ id?: string; document?: string; message?: string; type?: string }>,
    defaultCategory: string
  ): GuardFinding[] {
    return findings
      .filter((f) => f.message)
      .map((f, index) => ({
        id: f.id || `${defaultCategory.toUpperCase()}-${index + 1}`,
        message: f.message || 'Unknown issue',
        document: f.document,
        hint: f.type
      }));
  }

  private analyzeTextResponse(response: string): AnalyzerResult {
    const issues: GuardFinding[] = [];
    const warnings: GuardFinding[] = [];
    const suggestions: GuardFinding[] = [];

    const lowerResponse = response.toLowerCase();

    if (lowerResponse.includes('no issues') || lowerResponse.includes('no problems') || lowerResponse.includes('consistent')) {
      return { issues, warnings, suggestions };
    }

    const issuePatterns = [
      /purpose\s+conflict/i,
      /scope\s+gap/i,
      /adr\s+conflict/i,
      /parent\s+inconsistency/i,
      /role\s+violation/i,
      /contradict/i,
      /inconsistent/i
    ];

    const warningPatterns = [/suggestion/i, /consider/i, /recommend/i, /improve/i];

    let issueCount = 0;
    let suggestionCount = 0;

    for (const pattern of issuePatterns) {
      if (pattern.test(response)) {
        const matches = response.match(new RegExp(pattern.source, 'gi'));
        if (matches) {
          matches.forEach((match, index) => {
            issues.push({
              id: `ISSUE-TEXT-${issueCount + index + 1}`,
              message: `Detected potential issue: ${match}`
            });
          });
          issueCount += matches.length;
        }
      }
    }

    for (const pattern of warningPatterns) {
      if (pattern.test(response)) {
        const matches = response.match(new RegExp(pattern.source, 'gi'));
        if (matches) {
          matches.forEach((match, index) => {
            suggestions.push({
              id: `SUGGEST-TEXT-${suggestionCount + index + 1}`,
              message: `Suggestion: ${match}`
            });
            suggestionCount += matches.length;
          });
        }
      }
    }

    if (issueCount === 0 && suggestionCount === 0) {
      const lines = response.split('\n').filter((line) => line.trim().length > 0);
      if (lines.length > 0) {
        warnings.push({
          id: 'WARN-TEXT-1',
          message: 'LLM response could not be parsed. Review the full response manually.'
        });
      }
    }

    return { issues, warnings, suggestions };
  }
}

