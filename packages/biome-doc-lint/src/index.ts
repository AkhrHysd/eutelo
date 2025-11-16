import { RuleEngine, type DocLintIssue } from '@eutelo/core';

export type BiomePosition = { line: number; column: number };

export type BiomeDiagnostic = {
  message: string;
  severity: 'error' | 'warning';
  location?: { start: BiomePosition };
};

export type BiomeDocLintPlugin = {
  name: string;
  version: string;
  analyzeText(content: string, filePath?: string): BiomeDiagnostic[] | Promise<BiomeDiagnostic[]>;
  recommendedConfig: Record<string, unknown>;
};

const engine = new RuleEngine();

function toBiomeLocation(issue: DocLintIssue, content: string): { start: BiomePosition } | undefined {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === '---');
  const end = start === -1 ? -1 : lines.findIndex((line, index) => index > start && line.trim() === '---');

  if (issue.ruleId === 'frontmatter-missing') {
    return { start: { line: 1, column: 0 } };
  }
  if (issue.ruleId === 'frontmatter-not-at-top' && start > 0) {
    return { start: { line: start + 1, column: 0 } };
  }
  if (issue.ruleId === 'frontmatter-unclosed' && start !== -1) {
    return { start: { line: start + 1, column: 0 } };
  }

  if (issue.ruleId === 'missing-h1-heading') {
    const afterFrontmatter = end !== -1 ? end + 1 : start !== -1 ? start + 1 : 1;
    return { start: { line: afterFrontmatter, column: 0 } };
  }

  if (issue.field && start !== -1 && end !== -1) {
    const fieldName = issue.field.toLowerCase();
    const fieldLineIndex = lines
      .slice(start + 1, end)
      .findIndex((line) => line.trimStart().toLowerCase().startsWith(`${fieldName}:`));
    if (fieldLineIndex !== -1) {
      return { start: { line: start + 2 + fieldLineIndex, column: 0 } };
    }
    return { start: { line: start + 1, column: 0 } };
  }

  if (start !== -1) {
    return { start: { line: start + 1, column: 0 } };
  }

  return undefined;
}

export async function createDocLintDiagnostics(content: string, filePath?: string): Promise<BiomeDiagnostic[]> {
  const { issues } = await engine.lint({ content, filePath });
  return issues.map((issue) => ({
    message: issue.message,
    severity: issue.severity,
    location: toBiomeLocation(issue, content)
  }));
}

export function createBiomeDocLintPlugin(): BiomeDocLintPlugin {
  return {
    name: '@eutelo/biome-doc-lint',
    version: '0.1.0',
    async analyzeText(content: string, filePath?: string) {
      return createDocLintDiagnostics(content, filePath);
    },
    recommendedConfig: {
      extends: ['@eutelo/biome-doc-lint/recommended']
    }
  };
}

export const recommended = {
  name: '@eutelo/biome-doc-lint/recommended',
  rules: {
    'doc-lint': 'error'
  }
};
