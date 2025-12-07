import assert from 'node:assert/strict';
import test from 'node:test';
import { RuleParser } from '../dist/rule-validation/RuleParser.js';

test('RuleParser parses rule file with frontmatter and body', () => {
  const content = `---
version: "1.0"
description: "PRD ドキュメントの検証ルール"
---

# PRD Validation Rules

## Frontmatter Rules

### Required Fields
- \`id\`: 必須。形式: \`PRD-{FEATURE}\`
- \`type\`: 必須。値: \`prd\`
- \`purpose\`: 必須。空文字列不可

### Field Validation
- \`status\`: 必須。値は \`draft\`, \`review\`, \`approved\` のいずれか
`;

  const parser = new RuleParser();
  const result = parser.parse(content);

  assert.equal(result.rule.version, '1.0');
  assert.equal(result.rule.description, 'PRD ドキュメントの検証ルール');
  assert.equal(result.issues.length, 0);
  assert(result.rule.frontmatterRules.length > 0);
});

test('RuleParser parses frontmatter rules', () => {
  const content = `---
version: "1.0"
---

## Frontmatter Rules

### Required Fields
- \`id\`: 必須。形式: \`PRD-{FEATURE}\`
- \`type\`: 必須。値: \`prd\`
- \`purpose\`: 必須。空文字列不可
`;

  const parser = new RuleParser();
  const result = parser.parse(content);

  const requiredRules = result.rule.frontmatterRules.filter(r => r.type === 'required');
  assert.equal(requiredRules.length, 3);
  assert(requiredRules.some(r => r.field === 'id'));
  assert(requiredRules.some(r => r.field === 'type'));
  assert(requiredRules.some(r => r.field === 'purpose'));
});

test('RuleParser parses field format rules', () => {
  const content = `---
version: "1.0"
---

## Frontmatter Rules

### Field Validation
- \`id\`: 必須。形式: \`PRD-{FEATURE}\`
- \`status\`: 必須。値は \`draft\`, \`review\`, \`approved\` のいずれか
`;

  const parser = new RuleParser();
  const result = parser.parse(content);

  const formatRules = result.rule.frontmatterRules.filter(r => r.type === 'format');
  assert(formatRules.length > 0);
  assert(formatRules.some(r => r.field === 'id' && r.condition === 'PRD-{FEATURE}'));

  const enumRules = result.rule.frontmatterRules.filter(r => r.type === 'enum');
  assert(enumRules.length > 0);
  assert(enumRules.some(r => r.field === 'status'));
});

test('RuleParser parses structure rules', () => {
  const content = `---
version: "1.0"
---

## Structure Rules

### Heading Structure
- H1 見出しが存在すること
- H1 見出しの形式: \`# PRD-{FEATURE}\`

### Section Requirements
- \`## Purpose\` セクションが存在すること
- \`## Background\` セクションが存在すること
`;

  const parser = new RuleParser();
  const result = parser.parse(content);

  const headingRules = result.rule.structureRules.filter(r => r.type === 'heading');
  assert(headingRules.length > 0);

  const sectionRules = result.rule.structureRules.filter(r => r.type === 'section');
  assert(sectionRules.length > 0);
  assert(sectionRules.some(r => r.condition === 'Purpose'));
  assert(sectionRules.some(r => r.condition === 'Background'));
});

test('RuleParser returns error when frontmatter is missing', () => {
  const content = `# PRD Validation Rules

## Frontmatter Rules
`;

  const parser = new RuleParser();
  const result = parser.parse(content);

  assert(result.issues.length > 0);
  assert(result.issues.some(issue => 
    issue.severity === 'error' && 
    issue.message.includes('frontmatter')
  ));
});

test('RuleParser parses validationMode from frontmatter', () => {
  const content = `---
version: "1.0"
validationMode: "llm"
model: "gpt-4o-mini"
temperature: 0.2
---

## Frontmatter Rules
`;

  const parser = new RuleParser();
  const result = parser.parse(content);

  assert.equal(result.rule.validationMode, 'llm');
  assert.equal(result.rule.model, 'gpt-4o-mini');
  assert.equal(result.rule.temperature, 0.2);
});

