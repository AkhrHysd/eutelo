import { RuleEngine, type DocLintIssue } from '@eutelo/core';

type RuleListener = {
  Program?: (node: unknown) => void;
};

type RuleContext = {
  report(descriptor: { message: string; loc?: { line: number; column: number }; node?: unknown }): void;
  getSourceCode(): { text: string };
  getFilename(): string;
};

type RuleModule = {
  meta: {
    docs: { description: string; recommended: boolean };
    type: 'problem';
    schema: unknown[];
  };
  create(context: RuleContext): RuleListener;
};

type ESLintPlugin = {
  meta: { name: string; version: string };
  rules: Record<string, RuleModule>;
  configs: Record<string, { plugins: Record<string, ESLintPlugin>; rules: Record<string, string> }>;
};

const engine = new RuleEngine();

function toSourceLocation(issue: DocLintIssue, source: string): { line: number; column: number } | undefined {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === '---');
  const end = start === -1 ? -1 : lines.findIndex((line, index) => index > start && line.trim() === '---');

  if (issue.ruleId === 'frontmatter-missing') {
    return { line: 1, column: 0 };
  }
  if (issue.ruleId === 'frontmatter-not-at-top' && start > 0) {
    return { line: start + 1, column: 0 };
  }
  if (issue.ruleId === 'frontmatter-unclosed' && start !== -1) {
    return { line: start + 1, column: 0 };
  }

  if (issue.ruleId === 'missing-h1-heading') {
    const afterFrontmatter = end !== -1 ? end + 1 : start !== -1 ? start + 1 : 1;
    return { line: afterFrontmatter, column: 0 };
  }

  if (issue.field && start !== -1 && end !== -1) {
    const fieldLineIndex = lines
      .slice(start + 1, end)
      .findIndex((line) => line.trimStart().toLowerCase().startsWith(`${issue.field?.toLowerCase()}:`));
    if (fieldLineIndex !== -1) {
      return { line: start + 2 + fieldLineIndex, column: 0 };
    }
    return { line: start + 1, column: 0 };
  }

  if (start !== -1) {
    return { line: start + 1, column: 0 };
  }

  return undefined;
}

const docLintRule: RuleModule = {
  meta: {
    docs: {
      description: 'Run Eutelo doc-lint frontmatter validation for Markdown files.',
      recommended: true
    },
    type: 'problem',
    schema: []
  },
  create(context) {
    return {
      async Program(node) {
        const source = context.getSourceCode().text;
        const { issues } = await engine.lint({ content: source, filePath: context.getFilename() });

        for (const issue of issues) {
          context.report({
            node,
            message: issue.message,
            loc: toSourceLocation(issue, source)
          });
        }
      }
    };
  }
};

const plugin: ESLintPlugin = {
  meta: { name: 'eslint-plugin-eutelo-docs', version: '0.1.0' },
  rules: { 'doc-lint': docLintRule },
  configs: {
    recommended: {
      plugins: {},
      rules: { 'eutelo-docs/doc-lint': 'error' }
    }
  }
};

plugin.configs.recommended.plugins['eutelo-docs'] = plugin;

export const rules = plugin.rules;
export const configs = plugin.configs;
export default plugin;
