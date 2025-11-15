import type { GuardFinding } from '../services/GuardService.js';

export type AnalysisResult = {
  summary: string;
  issues: GuardFinding[];
  warnings: GuardFinding[];
  suggestions: GuardFinding[];
};

export class Analyzer {
  analyze(raw: string): AnalysisResult {
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      return defaultResult('LLM response was empty.');
    }
    const trimmed = raw.trim();
    const jsonResult = this.tryParseJson(trimmed);
    if (jsonResult) {
      return jsonResult;
    }
    return this.parseFallback(trimmed);
  }

  private tryParseJson(payload: string): AnalysisResult | undefined {
    try {
      const parsed = JSON.parse(payload);
      if (!parsed || typeof parsed !== 'object') {
        return undefined;
      }
      const summary = typeof parsed.summary === 'string' ? parsed.summary : 'Document guard results';
      const issues = normalizeFindingArray(parsed.issues);
      const warnings = normalizeFindingArray(parsed.warnings);
      const suggestions = normalizeFindingArray(parsed.suggestions);
      if (!issues && !warnings && !suggestions) {
        return undefined;
      }
      return {
        summary,
        issues: issues ?? [],
        warnings: warnings ?? [],
        suggestions: suggestions ?? []
      };
    } catch {
      return undefined;
    }
  }

  private parseFallback(payload: string): AnalysisResult {
    const summary = extractSection(payload, /^summary[:\s]/i) ?? 'Document guard summary unavailable.';
    const issues = parseListSection(payload, /issues?/i);
    const warnings = parseListSection(payload, /warnings?/i);
    const suggestions = parseListSection(payload, /suggestions?/i);
    return {
      summary,
      issues,
      warnings,
      suggestions
    };
  }
}

function normalizeFindingArray(value: unknown): GuardFinding[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const findings: GuardFinding[] = [];
  for (const entry of value) {
    if (!entry) continue;
    if (typeof entry === 'string') {
      findings.push({ id: entry, message: entry });
      continue;
    }
    if (typeof entry === 'object') {
      const cast = entry as Record<string, unknown>;
      const id = typeof cast.id === 'string' && cast.id.trim().length > 0 ? cast.id : undefined;
      const message = typeof cast.message === 'string' ? cast.message : id ?? 'Issue detected';
      const document = typeof cast.document === 'string' ? cast.document : undefined;
      const hint = typeof cast.hint === 'string' ? cast.hint : undefined;
      findings.push({
        id: id ?? `ISSUE-${findings.length + 1}`,
        message,
        document,
        hint
      });
    }
  }
  return findings;
}

function extractSection(payload: string, matcher: RegExp): string | undefined {
  const lines = payload.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => matcher.test(line));
  if (startIndex === -1) {
    return undefined;
  }
  const sectionLines: string[] = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (index > startIndex && /^[A-Z][A-Za-z\s]+:/.test(line)) {
      break;
    }
    sectionLines.push(line);
  }
  return sectionLines.join('\n').split(':').slice(1).join(':').trim();
}

function parseListSection(payload: string, titlePattern: RegExp): GuardFinding[] {
  const lines = payload.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => titlePattern.test(line));
  if (startIndex === -1) {
    return [];
  }
  const findings: GuardFinding[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^[A-Z][A-Za-z\s]+:/.test(line)) {
      break;
    }
    if (!line || !line.trim().startsWith('-')) {
      continue;
    }
    const entry = line.replace(/^-+\s*/, '').trim();
    if (!entry) continue;
    const [pathPart, ...messageParts] = entry.split(':');
    const document = messageParts.length > 0 ? pathPart.trim() : undefined;
    const message = messageParts.length > 0 ? messageParts.join(':').trim() : entry;
    findings.push({
      id: `FALLBACK-${findings.length + 1}`,
      document,
      message
    });
  }
  return findings;
}

function defaultResult(summary: string): AnalysisResult {
  return {
    summary,
    issues: [],
    warnings: [],
    suggestions: []
  };
}

export function createAnalyzer(): Analyzer {
  return new Analyzer();
}
