export type LintSeverity = 'error' | 'warning';

export type FrontmatterIssue = {
  ruleId: 'frontmatter-missing' | 'frontmatter-not-at-top' | 'frontmatter-unclosed' | 'missing-required-field' | 'unknown-field';
  message: string;
  severity: LintSeverity;
  field?: string;
};

export type Frontmatter = Record<string, string | undefined> & {
  raw: string;
};

export type FrontmatterParseResult = {
  frontmatter: Frontmatter | null;
  issues: FrontmatterIssue[];
};

export type FrontmatterParserOptions = {
  requiredFields?: string[];
  allowedFields?: string[];
};

const DEFAULT_REQUIRED_FIELDS = ['id', 'type', 'feature', 'purpose', 'parent'];
const DEFAULT_ALLOWED_FIELDS = [
  ...DEFAULT_REQUIRED_FIELDS,
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

export class FrontmatterParser {
  private readonly requiredFields: Set<string>;
  private readonly allowedFields: Set<string>;

  constructor(options: FrontmatterParserOptions = {}) {
    this.requiredFields = new Set(options.requiredFields ?? DEFAULT_REQUIRED_FIELDS);
    this.allowedFields = new Set(options.allowedFields ?? DEFAULT_ALLOWED_FIELDS);
  }

  parse(content: string): FrontmatterParseResult {
    const issues: FrontmatterIssue[] = [];
    const lines = content.split(/\r?\n/);
    const startIndex = lines.findIndex((line) => line.trim() === '---');

    if (startIndex === -1) {
      issues.push({
        ruleId: 'frontmatter-missing',
        severity: 'error',
        message: 'Frontmatter block is required at the top of the document.'
      });
      return { frontmatter: null, issues };
    }

    if (startIndex > 0) {
      issues.push({
        ruleId: 'frontmatter-not-at-top',
        severity: 'error',
        message: 'Frontmatter must start at the first line of the document.'
      });
    }

    const endIndex = lines.findIndex((line, index) => index > startIndex && line.trim() === '---');
    if (endIndex === -1) {
      issues.push({
        ruleId: 'frontmatter-unclosed',
        severity: 'error',
        message: 'Frontmatter block is not closed with ---.'
      });
      return { frontmatter: null, issues };
    }

    const blockLines = lines.slice(startIndex + 1, endIndex);
    const block = blockLines.join('\n');
    const parsed = parseFrontmatterBlock(blockLines);
    const frontmatter: Frontmatter = { ...parsed, raw: block };

    for (const field of this.requiredFields) {
      const value = frontmatter[field];
      if (!value) {
        issues.push({
          ruleId: 'missing-required-field',
          severity: 'error',
          field,
          message: `Missing required field "${field}" in frontmatter.`
        });
      }
    }

    for (const key of Object.keys(parsed)) {
      if (!this.allowedFields.has(key)) {
        issues.push({
          ruleId: 'unknown-field',
          severity: 'warning',
          field: key,
          message: `Unknown frontmatter field: ${key}`
        });
      }
    }

    return { frontmatter, issues };
  }
}

function parseFrontmatterBlock(lines: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  let captureKey: string | null = null;
  let captureBuffer: string[] = [];

  for (let index = 0; index <= lines.length; index++) {
    const line = index < lines.length ? lines[index] : undefined;
    if (captureKey) {
      if (line === undefined) {
        parsed[captureKey] = captureBuffer.join('\n').trim();
        break;
      }
      if (line.trim() === '' || /^[\t ]/.test(line)) {
        captureBuffer.push(line.trim());
        continue;
      }
      parsed[captureKey] = captureBuffer.join('\n').trim();
      captureKey = null;
      captureBuffer = [];
      index--;
      continue;
    }

    if (line === undefined) {
      break;
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }

    const key = line.slice(0, colonIndex).trim();
    const rawValue = line.slice(colonIndex + 1).trim();
    if (!key) {
      continue;
    }

    if (rawValue === '>' || rawValue === '|') {
      captureKey = key;
      captureBuffer = [];
      continue;
    }

    if (rawValue) {
      parsed[key] = stripQuotes(rawValue);
    }
  }

  return parsed;
}

function stripQuotes(value: string): string {
  if (value.length >= 2) {
    const startsWithDoubleQuote = value.startsWith('"') && value.endsWith('"');
    const startsWithSingleQuote = value.startsWith("'") && value.endsWith("'");
    if (startsWithDoubleQuote || startsWithSingleQuote) {
      return value.slice(1, -1);
    }
  }
  return value;
}
