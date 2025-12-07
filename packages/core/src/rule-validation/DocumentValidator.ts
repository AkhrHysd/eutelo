/**
 * DocumentValidator - Validates documents against rules
 */

import { FrontmatterParser } from '../doc-lint/frontmatter-parser.js';
import type { RuleDefinition, FrontmatterRule, StructureRule } from './RuleParser.js';
import type { RuleValidationIssue } from './types.js';

export type DocumentToValidate = {
  path: string;
  content: string;
};

export type ValidationResult = {
  file: string;
  issues: RuleValidationIssue[];
};

export class DocumentValidator {
  private readonly frontmatterParser: FrontmatterParser;

  constructor() {
    this.frontmatterParser = new FrontmatterParser({
      requiredFields: [],
      allowedFields: [] // Allow all fields for rule validation
    });
  }

  validate(document: DocumentToValidate, rule: RuleDefinition): ValidationResult {
    const issues: RuleValidationIssue[] = [];

    // Parse frontmatter
    const { frontmatter } = this.frontmatterParser.parse(document.content);

    if (!frontmatter) {
      issues.push({
        severity: 'error',
        rule: 'Frontmatter Rules',
        message: 'Document must have frontmatter',
        file: document.path
      });
      return { file: document.path, issues };
    }

    // Apply frontmatter rules
    for (const ruleItem of rule.frontmatterRules) {
      const ruleIssues = this.applyFrontmatterRule(frontmatter, ruleItem, document.path);
      issues.push(...ruleIssues);
    }

    // Apply structure rules
    for (const ruleItem of rule.structureRules) {
      const ruleIssues = this.applyStructureRule(document.content, ruleItem, document.path);
      issues.push(...ruleIssues);
    }

    // Content rules are not implemented yet (future extension)

    return { file: document.path, issues };
  }

  private applyFrontmatterRule(
    frontmatter: Record<string, string | undefined>,
    rule: FrontmatterRule,
    filePath: string
  ): RuleValidationIssue[] {
    const issues: RuleValidationIssue[] = [];
    const fieldValue = frontmatter[rule.field];

    switch (rule.type) {
      case 'required':
        if (!fieldValue || fieldValue.trim() === '') {
          issues.push({
            severity: 'error',
            rule: rule.name,
            message: rule.message || `Missing required field "${rule.field}"`,
            hint: `Add '${rule.field}' field to frontmatter.`,
            file: filePath
          });
        }
        break;

      case 'format':
        if (fieldValue && rule.condition) {
          const pattern = this.convertPatternToRegex(rule.condition);
          if (!pattern.test(fieldValue)) {
            issues.push({
              severity: 'error',
              rule: rule.name,
              message: rule.message || `Invalid format for field "${rule.field}"`,
              hint: `Expected format: ${rule.condition}`,
              file: filePath
            });
          }
        }
        break;

      case 'enum':
        if (fieldValue && rule.condition) {
          const allowedValues = rule.condition.split(',').map(v => v.trim());
          if (!allowedValues.includes(fieldValue)) {
            issues.push({
              severity: 'error',
              rule: rule.name,
              message: rule.message || `Invalid value for field "${rule.field}"`,
              hint: `Allowed values: ${allowedValues.join(', ')}`,
              file: filePath
            });
          }
        }
        break;
    }

    return issues;
  }

  private applyStructureRule(
    content: string,
    rule: StructureRule,
    filePath: string
  ): RuleValidationIssue[] {
    const issues: RuleValidationIssue[] = [];

    switch (rule.type) {
      case 'heading':
        if (rule.condition.includes('H1')) {
          const h1Match = content.match(/^#\s+(.+)$/m);
          if (!h1Match) {
            issues.push({
              severity: 'error',
              rule: rule.name,
              message: rule.message || 'H1 heading is required',
              file: filePath
            });
          } else if (rule.condition.includes('形式')) {
            // Check heading format if specified
            const formatMatch = rule.condition.match(/形式[：:]\s*`([^`]+)`/);
            if (formatMatch) {
              const expectedPattern = this.convertPatternToRegex(formatMatch[1]);
              const actualHeading = h1Match[1].trim();
              if (!expectedPattern.test(actualHeading)) {
                issues.push({
                  severity: 'error',
                  rule: rule.name,
                  message: rule.message || `Invalid H1 heading format`,
                  hint: `Expected format: ${formatMatch[1]}`,
                  file: filePath
                });
              }
            }
          }
        }
        break;

      case 'section': {
        // Check if section exists
        const sectionRegex = new RegExp(`^##\\s+${rule.condition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
        if (!sectionRegex.test(content)) {
          issues.push({
            severity: 'error',
            rule: rule.name,
            message: rule.message || `Required section "## ${rule.condition}" is missing`,
            hint: `Add "## ${rule.condition}" section to the document.`,
            file: filePath
          });
        }
        break;
      }
    }

    return issues;
  }

  private convertPatternToRegex(pattern: string): RegExp {
    // Convert pattern like "PRD-{FEATURE}" to regex
    // {FEATURE} becomes a wildcard match
    const escaped = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\{[^}]+\\\}/g, '[^\\s-]+');
    return new RegExp(`^${escaped}$`);
  }
}

