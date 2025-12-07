import assert from 'node:assert/strict';
import test from 'node:test';
import { DocumentValidator } from '../dist/rule-validation/DocumentValidator.js';

test('DocumentValidator validates required fields', () => {
  const validator = new DocumentValidator();
  const document = {
    path: 'test.md',
    content: `---
id: PRD-TEST
type: prd
---
# PRD-TEST
`
  };

  const rule = {
    frontmatterRules: [
      {
        name: 'Required: purpose',
        type: 'required',
        field: 'purpose',
        message: 'Missing required field "purpose"'
      }
    ],
    structureRules: [],
    contentRules: []
  };

  const result = validator.validate(document, rule);

  assert(result.issues.length > 0);
  assert(result.issues.some(issue => 
    issue.severity === 'error' && 
    issue.message.includes('purpose')
  ));
});

test('DocumentValidator validates field format', () => {
  const validator = new DocumentValidator();
  const document = {
    path: 'test.md',
    content: `---
id: WRONG-FORMAT
type: prd
---
# WRONG-FORMAT
`
  };

  const rule = {
    frontmatterRules: [
      {
        name: 'Format: id',
        type: 'format',
        field: 'id',
        condition: 'PRD-{FEATURE}',
        message: 'Invalid format for field "id"'
      }
    ],
    structureRules: [],
    contentRules: []
  };

  const result = validator.validate(document, rule);

  // WRONG-FORMAT doesn't match PRD-{FEATURE} pattern
  assert(result.issues.length > 0);
  assert(result.issues.some(issue => 
    issue.severity === 'error' && 
    issue.rule === 'Format: id'
  ));
});

test('DocumentValidator validates field enum', () => {
  const validator = new DocumentValidator();
  const document = {
    path: 'test.md',
    content: `---
id: PRD-TEST
type: prd
status: invalid
---
# PRD-TEST
`
  };

  const rule = {
    frontmatterRules: [
      {
        name: 'Enum: status',
        type: 'enum',
        field: 'status',
        condition: 'draft,review,approved',
        message: 'Invalid value for field "status"'
      }
    ],
    structureRules: [],
    contentRules: []
  };

  const result = validator.validate(document, rule);

  assert(result.issues.length > 0);
  assert(result.issues.some(issue => 
    issue.severity === 'error' && 
    issue.rule === 'Enum: status'
  ));
});

test('DocumentValidator validates heading structure', () => {
  const validator = new DocumentValidator();
  const document = {
    path: 'test.md',
    content: `---
id: PRD-TEST
type: prd
---
## No H1 heading
`
  };

  const rule = {
    frontmatterRules: [],
    structureRules: [
      {
        name: 'Heading: H1 required',
        type: 'heading',
        condition: 'H1 見出しが存在すること',
        message: 'H1 heading is required'
      }
    ],
    contentRules: []
  };

  const result = validator.validate(document, rule);

  assert(result.issues.length > 0);
  assert(result.issues.some(issue => 
    issue.severity === 'error' && 
    issue.rule === 'Heading: H1 required'
  ));
});

test('DocumentValidator validates section requirements', () => {
  const validator = new DocumentValidator();
  const document = {
    path: 'test.md',
    content: `---
id: PRD-TEST
type: prd
---
# PRD-TEST

## Purpose

Some content.
`
  };

  const rule = {
    frontmatterRules: [],
    structureRules: [
      {
        name: 'Section: Background',
        type: 'section',
        condition: 'Background',
        message: 'Required section "## Background" is missing'
      }
    ],
    contentRules: []
  };

  const result = validator.validate(document, rule);

  assert(result.issues.length > 0);
  assert(result.issues.some(issue => 
    issue.severity === 'error' && 
    issue.rule === 'Section: Background'
  ));
});

test('DocumentValidator returns no issues for valid document', () => {
  const validator = new DocumentValidator();
  const document = {
    path: 'test.md',
    content: `---
id: PRD-TEST
type: prd
purpose: Test purpose
status: draft
---
# PRD-TEST

## Purpose

Some content.

## Background

Some background.
`
  };

  const rule = {
    frontmatterRules: [
      {
        name: 'Required: id',
        type: 'required',
        field: 'id'
      },
      {
        name: 'Required: purpose',
        type: 'required',
        field: 'purpose'
      },
      {
        name: 'Enum: status',
        type: 'enum',
        field: 'status',
        condition: 'draft,review,approved'
      }
    ],
    structureRules: [
      {
        name: 'Heading: H1 required',
        type: 'heading',
        condition: 'H1 見出しが存在すること'
      },
      {
        name: 'Section: Purpose',
        type: 'section',
        condition: 'Purpose'
      },
      {
        name: 'Section: Background',
        type: 'section',
        condition: 'Background'
      }
    ],
    contentRules: []
  };

  const result = validator.validate(document, rule);

  assert.equal(result.issues.length, 0);
});

