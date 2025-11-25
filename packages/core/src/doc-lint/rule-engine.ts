import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveDocsRoot } from '../constants/docsRoot.js';
import { FrontmatterParser, type FrontmatterIssue } from './frontmatter-parser.js';
import { analyzeStructure, resolveParentPath, type StructureExpectation } from './structure-analyzer.js';
import type { FrontmatterSchemaConfig } from '../config/types.js';

export type DocLintIssue = FrontmatterIssue | {
  ruleId:
    | 'id-format-invalid'
    | 'type-mismatch-path'
    | 'parent-not-found'
    | 'missing-h1-heading';
  message: string;
  severity: 'error' | 'warning';
  field?: string;
};

export type RuleEngineOptions = {
  docsRoot?: string;
  fileExists?: (targetPath: string) => Promise<boolean>;
  frontmatterSchemas?: FrontmatterSchemaConfig[];
};

export type LintTarget = {
  content: string;
  filePath?: string;
};

export type LintResult = {
  issues: DocLintIssue[];
  frontmatter: Record<string, string | undefined> | null;
  structure: StructureExpectation | null;
};

const DEFAULT_ALLOWED_FIELDS = [
  'id',
  'type',
  'feature',
  'purpose',
  'parent',
  'title',
  'status',
  'version',
  'owners',
  'tags',
  'last_updated',
  'date',
  'links',
  'subfeature'
];

function buildAllowedFields(schemas?: FrontmatterSchemaConfig[]): string[] {
  const fields = new Set<string>(DEFAULT_ALLOWED_FIELDS);
  for (const schema of schemas ?? []) {
    for (const field of Object.keys(schema.fields ?? {})) {
      if (field) {
        fields.add(field);
      }
    }
  }
  return Array.from(fields);
}

function buildRequiredFields(schemas?: FrontmatterSchemaConfig[]): string[] {
  const required = new Set<string>(['id', 'type', 'feature', 'purpose', 'parent']);
  for (const schema of schemas ?? []) {
    for (const [field, definition] of Object.entries(schema.fields ?? {})) {
      if (definition?.required) {
        required.add(field);
      }
    }
  }
  return Array.from(required);
}

export class RuleEngine {
  private readonly parser: FrontmatterParser;
  private readonly docsRoot: string;
  private readonly fileExists: (targetPath: string) => Promise<boolean>;

  constructor(options: RuleEngineOptions = {}) {
    const allowedFields = buildAllowedFields(options.frontmatterSchemas);
    const requiredFields = buildRequiredFields(options.frontmatterSchemas);
    this.parser = new FrontmatterParser({ allowedFields, requiredFields });
    this.docsRoot = options.docsRoot ?? resolveDocsRoot();
    this.fileExists =
      options.fileExists ?? (async (targetPath: string) => fs.access(targetPath).then(() => true).catch(() => false));
  }

  async lint(target: LintTarget): Promise<LintResult> {
    const { issues: frontmatterIssues, frontmatter } = this.parser.parse(target.content);
    const structure = target.filePath ? analyzeStructure(target.filePath, { docsRoot: this.docsRoot }) : null;
    const issues: DocLintIssue[] = [...frontmatterIssues];

    if (frontmatter) {
      if (structure) {
        this.applyTypeConsistencyRule(frontmatter, structure, issues);
        this.applyIdFormatRule(frontmatter, structure, issues);
      }
      await this.applyParentExistsRule(frontmatter, issues);
      this.applyH1HeadingRule(target.content, issues);
    }

    return { issues, frontmatter, structure };
  }

  private applyTypeConsistencyRule(
    frontmatter: Record<string, string | undefined>,
    structure: StructureExpectation,
    issues: DocLintIssue[]
  ) {
    const declaredType = frontmatter.type?.toLowerCase();
    if (declaredType && declaredType !== structure.type) {
      issues.push({
        ruleId: 'type-mismatch-path',
        severity: 'error',
        field: 'type',
        message: `Type mismatch: expected "${structure.type}" based on path but found "${declaredType}".`
      });
    }
  }

  private applyIdFormatRule(
    frontmatter: Record<string, string | undefined>,
    structure: StructureExpectation,
    issues: DocLintIssue[]
  ) {
    const id = frontmatter.id;
    if (!id) return;
    if (!structure.idPattern.test(id)) {
      issues.push({
        ruleId: 'id-format-invalid',
        severity: 'error',
        field: 'id',
        message: `Invalid id format for ${structure.type}. Expected pattern ${structure.idPattern}.`
      });
    }
  }

  private async applyParentExistsRule(frontmatter: Record<string, string | undefined>, issues: DocLintIssue[]) {
    const parent = frontmatter.parent;
    if (!parent) return;
    const parentPath = resolveParentPath(parent, this.docsRoot);
    if (!parentPath) return;
    const exists = await this.fileExists(path.resolve(parentPath));
    if (!exists) {
      issues.push({
        ruleId: 'parent-not-found',
        severity: 'error',
        field: 'parent',
        message: `Parent document not found: ${parent}`
      });
    }
  }

  private applyH1HeadingRule(content: string, issues: DocLintIssue[]) {
    const lines = content.split(/\r?\n/);
    const firstDelimiter = lines.findIndex((line) => line.trim() === '---');
    let bodyStart = 0;

    if (firstDelimiter !== -1) {
      const secondDelimiter = lines.findIndex((line, index) => index > firstDelimiter && line.trim() === '---');
      if (secondDelimiter !== -1) {
        bodyStart = secondDelimiter + 1;
      }
    }

    const bodyLines = lines.slice(bodyStart);
    const firstContentLine = bodyLines.find((line) => line.trim().length > 0);
    if (firstContentLine && !/^#\s+/.test(firstContentLine)) {
      issues.push({
        ruleId: 'missing-h1-heading',
        severity: 'error',
        message: 'Document must start with an H1 heading.'
      });
    }
  }
}
