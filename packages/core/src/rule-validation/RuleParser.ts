/**
 * RuleParser - Parses rule files (Markdown with YAML frontmatter)
 */

import { FrontmatterParser } from '../doc-lint/frontmatter-parser.js';

export type RuleDefinition = {
  version?: string;
  description?: string;
  validationMode?: 'static' | 'llm';
  model?: string;
  temperature?: number;
  frontmatterRules: FrontmatterRule[];
  structureRules: StructureRule[];
  contentRules: ContentRule[];
};

export type FrontmatterRule = {
  name: string;
  type: 'required' | 'format' | 'enum' | 'custom';
  field: string;
  condition?: string;
  message?: string;
};

export type StructureRule = {
  name: string;
  type: 'heading' | 'section' | 'order';
  condition: string;
  message?: string;
};

export type ContentRule = {
  name: string;
  type: 'length' | 'keyword' | 'custom';
  condition: string;
  message?: string;
};

export type RuleParseResult = {
  rule: RuleDefinition;
  issues: RuleParseIssue[];
};

export type RuleParseIssue = {
  severity: 'error' | 'warning';
  message: string;
  line?: number;
  column?: number;
};

export class RuleParser {
  private readonly frontmatterParser: FrontmatterParser;

  constructor() {
    // Rule files don't have strict required fields
    this.frontmatterParser = new FrontmatterParser({
      requiredFields: [],
      allowedFields: ['version', 'description', 'validationMode', 'model', 'temperature']
    });
  }

  parse(content: string): RuleParseResult {
    const issues: RuleParseIssue[] = [];
    
    // Parse frontmatter
    const { frontmatter, issues: frontmatterIssues } = this.frontmatterParser.parse(content);
    
    // Convert frontmatter issues to rule parse issues
    for (const issue of frontmatterIssues) {
      if (issue.severity === 'error' && issue.ruleId === 'frontmatter-missing') {
        issues.push({
          severity: 'error',
          message: 'Rule file must have YAML frontmatter at the top'
        });
      } else if (issue.severity === 'error') {
        issues.push({
          severity: 'error',
          message: issue.message
        });
      }
    }

    if (!frontmatter) {
      return {
        rule: {
          frontmatterRules: [],
          structureRules: [],
          contentRules: []
        },
        issues
      };
    }

    // Extract body content (after frontmatter)
    const lines = content.split(/\r?\n/);
    const startIndex = lines.findIndex((line) => line.trim() === '---');
    const endIndex = startIndex >= 0 
      ? lines.findIndex((line, index) => index > startIndex && line.trim() === '---')
      : -1;
    
    const bodyStart = endIndex >= 0 ? endIndex + 1 : 0;
    const bodyContent = lines.slice(bodyStart).join('\n');

    // Parse rule sections
    const frontmatterRules = this.parseFrontmatterRules(bodyContent, issues);
    const structureRules = this.parseStructureRules(bodyContent, issues);
    const contentRules = this.parseContentRules(bodyContent, issues);

    const rule: RuleDefinition = {
      version: frontmatter.version,
      description: frontmatter.description,
      validationMode: frontmatter.validationMode as 'static' | 'llm' | undefined,
      model: frontmatter.model,
      temperature: frontmatter.temperature ? parseFloat(frontmatter.temperature) : undefined,
      frontmatterRules,
      structureRules,
      contentRules
    };

    return { rule, issues };
  }

  private parseFrontmatterRules(content: string, issues: RuleParseIssue[]): FrontmatterRule[] {
    const rules: FrontmatterRule[] = [];
    const frontmatterSection = this.extractSection(content, 'Frontmatter Rules');
    
    if (!frontmatterSection) {
      return rules;
    }

    // Parse Required Fields subsection
    const requiredFields = this.extractSubsection(frontmatterSection, 'Required Fields');
    if (requiredFields) {
      const fieldRules = this.parseFieldList(requiredFields, 'required');
      rules.push(...fieldRules);
    }

    // Parse Field Validation subsection
    const fieldValidation = this.extractSubsection(frontmatterSection, 'Field Validation');
    if (fieldValidation) {
      const validationRules = this.parseFieldList(fieldValidation, 'format');
      rules.push(...validationRules);
    }

    return rules;
  }

  private parseStructureRules(content: string, issues: RuleParseIssue[]): StructureRule[] {
    const rules: StructureRule[] = [];
    const structureSection = this.extractSection(content, 'Structure Rules');
    
    if (!structureSection) {
      return rules;
    }

    // Parse Heading Structure subsection
    const headingStructure = this.extractSubsection(structureSection, 'Heading Structure');
    if (headingStructure) {
      const headingRules = this.parseStructureList(headingStructure, 'heading');
      rules.push(...headingRules);
    }

    // Parse Section Requirements subsection
    const sectionRequirements = this.extractSubsection(structureSection, 'Section Requirements');
    if (sectionRequirements) {
      const sectionRules = this.parseStructureList(sectionRequirements, 'section');
      rules.push(...sectionRules);
    }

    return rules;
  }

  private parseContentRules(content: string, issues: RuleParseIssue[]): ContentRule[] {
    const rules: ContentRule[] = [];
    const contentSection = this.extractSection(content, 'Content Rules');
    
    if (!contentSection) {
      return rules;
    }

    // For now, just return empty array (future extension)
    // Content rules parsing will be implemented later

    return rules;
  }

  private extractSection(content: string, sectionName: string): string | null {
    const regex = new RegExp(`^##\\s+${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
    const match = content.match(regex);
    if (!match) {
      return null;
    }

    const startIndex = match.index! + match[0].length;
    const nextSectionMatch = content.slice(startIndex).match(/^##\s+/m);
    const endIndex = nextSectionMatch 
      ? startIndex + nextSectionMatch.index!
      : content.length;

    return content.slice(startIndex, endIndex).trim();
  }

  private extractSubsection(section: string, subsectionName: string): string | null {
    const regex = new RegExp(`^###\\s+${subsectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
    const match = section.match(regex);
    if (!match) {
      return null;
    }

    const startIndex = match.index! + match[0].length;
    const nextSubsectionMatch = section.slice(startIndex).match(/^###\s+/m);
    const endIndex = nextSubsectionMatch 
      ? startIndex + nextSubsectionMatch.index!
      : section.length;

    return section.slice(startIndex, endIndex).trim();
  }

  private parseFieldList(content: string, ruleType: 'required' | 'format'): FrontmatterRule[] {
    const rules: FrontmatterRule[] = [];
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse list items like: `- \`id\`: 必須。形式: \`PRD-{FEATURE}\``
      const listItemMatch = trimmed.match(/^-\s*`([^`]+)`:\s*(.+)$/);
      if (listItemMatch) {
        const field = listItemMatch[1];
        const description = listItemMatch[2];
        
        // Extract format pattern if present
        const formatMatch = description.match(/形式[：:]\s*`([^`]+)`/);
        const enumMatch = description.match(/値は\s*`([^`]+)`/);
        
        if (ruleType === 'required') {
          rules.push({
            name: `Required: ${field}`,
            type: 'required',
            field,
            message: description
          });
        } else if (formatMatch) {
          rules.push({
            name: `Format: ${field}`,
            type: 'format',
            field,
            condition: formatMatch[1],
            message: description
          });
        } else if (enumMatch) {
          const enumValues = enumMatch[1].split(/[、,]\s*/);
          rules.push({
            name: `Enum: ${field}`,
            type: 'enum',
            field,
            condition: enumValues.join(','),
            message: description
          });
        }
      }
    }

    return rules;
  }

  private parseStructureList(content: string, ruleType: 'heading' | 'section'): StructureRule[] {
    const rules: StructureRule[] = [];
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse list items like: `- H1 見出しが存在すること`
      const listItemMatch = trimmed.match(/^-\s*(.+)$/);
      if (listItemMatch) {
        const description = listItemMatch[1];
        
        if (ruleType === 'heading') {
          // Extract heading pattern if present
          const headingMatch = description.match(/形式[：:]\s*`([^`]+)`/);
          rules.push({
            name: `Heading: ${description}`,
            type: 'heading',
            condition: headingMatch ? headingMatch[1] : description,
            message: description
          });
        } else if (ruleType === 'section') {
          // Extract section name if present
          const sectionMatch = description.match(/`##\s*([^`]+)`/);
          rules.push({
            name: `Section: ${description}`,
            type: 'section',
            condition: sectionMatch ? sectionMatch[1] : description,
            message: description
          });
        }
      }
    }

    return rules;
  }
}

