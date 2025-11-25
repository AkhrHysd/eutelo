import assert from 'node:assert/strict';
import test from 'node:test';
import { DocumentTypeRegistry } from '../dist/config/DocumentTypeRegistry.js';
import type { EuteloConfigResolved } from '../dist/config/types.js';

const createMockConfig = (): EuteloConfigResolved => ({
  presets: ['@eutelo/preset-default'],
  docsRoot: 'eutelo-docs',
  scaffold: {
    'document.prd': {
      id: 'document.prd',
      kind: 'prd',
      path: 'product/features/{FEATURE}/PRD-{FEATURE}.md',
      template: '_template-prd.md',
      variables: {
        ID: 'PRD-{FEATURE}',
        PARENT: 'PRINCIPLE-GLOBAL'
      }
    },
    'document.beh': {
      id: 'document.beh',
      kind: 'beh',
      path: 'product/features/{FEATURE}/BEH-{FEATURE}.md',
      template: '_template-beh.md',
      variables: {
        ID: 'BEH-{FEATURE}',
        PARENT: 'PRD-{FEATURE}'
      }
    },
    'document.custom': {
      id: 'document.custom',
      kind: 'custom-type',
      path: 'custom/{FEATURE}/CUSTOM-{FEATURE}.md',
      template: '_template-custom.md',
      variables: {
        ID: 'CUSTOM-{FEATURE}'
      }
    }
  },
  frontmatter: {
    schemas: [
      {
        kind: 'prd',
        fields: {
          id: { type: 'string', required: true },
          type: { type: 'string', required: true }
        }
      },
      {
        kind: 'beh',
        fields: {
          id: { type: 'string', required: true },
          type: { type: 'string', required: true }
        }
      },
      {
        kind: 'custom-type',
        fields: {
          id: { type: 'string', required: true },
          type: { type: 'string', required: true }
        }
      }
    ],
    rootParentIds: ['PRINCIPLE-GLOBAL']
  },
  guard: {
    prompts: {}
  },
  sources: {
    cwd: '/test',
    layers: []
  }
});

test('DocumentTypeRegistry.getDocumentTypes() returns all document types from config', () => {
  const config = createMockConfig();
  const registry = new DocumentTypeRegistry(config);
  const types = registry.getDocumentTypes();
  
  assert.deepEqual(types.sort(), ['beh', 'custom-type', 'prd']);
});

test('DocumentTypeRegistry.hasDocumentType() correctly identifies registered types', () => {
  const config = createMockConfig();
  const registry = new DocumentTypeRegistry(config);
  
  assert.equal(registry.hasDocumentType('prd'), true);
  assert.equal(registry.hasDocumentType('beh'), true);
  assert.equal(registry.hasDocumentType('custom-type'), true);
  assert.equal(registry.hasDocumentType('unknown'), false);
});

test('DocumentTypeRegistry.getScaffoldConfig() returns scaffold config for registered type', () => {
  const config = createMockConfig();
  const registry = new DocumentTypeRegistry(config);
  
  const scaffold = registry.getScaffoldConfig('prd');
  assert.ok(scaffold);
  assert.equal(scaffold?.kind, 'prd');
  assert.equal(scaffold?.id, 'document.prd');
  
  const unknown = registry.getScaffoldConfig('unknown');
  assert.equal(unknown, undefined);
});

test('DocumentTypeRegistry.getScaffoldConfig() returns scaffold config by kind', () => {
  const config = createMockConfig();
  const registry = new DocumentTypeRegistry(config);
  
  // kind で検索
  const scaffold = registry.getScaffoldConfig('beh');
  assert.ok(scaffold);
  assert.equal(scaffold?.kind, 'beh');
});

test('DocumentTypeRegistry.getFrontmatterSchema() returns schema for registered type', () => {
  const config = createMockConfig();
  const registry = new DocumentTypeRegistry(config);
  
  const schema = registry.getFrontmatterSchema('prd');
  assert.ok(schema);
  assert.equal(schema?.kind, 'prd');
  assert.ok(schema?.fields.id);
  
  const unknown = registry.getFrontmatterSchema('unknown');
  assert.equal(unknown, undefined);
});

test('DocumentTypeRegistry.getFrontmatterSchema() returns undefined for unregistered type', () => {
  const config = createMockConfig();
  const registry = new DocumentTypeRegistry(config);
  
  const schema = registry.getFrontmatterSchema('non-existent');
  assert.equal(schema, undefined);
});

test('DocumentTypeRegistry handles empty scaffold config', () => {
  const config: EuteloConfigResolved = {
    presets: [],
    docsRoot: 'eutelo-docs',
    scaffold: {},
    frontmatter: {
      schemas: [],
      rootParentIds: []
    },
    guard: {
      prompts: {}
    },
    sources: {
      cwd: '/test',
      layers: []
    }
  };
  
  const registry = new DocumentTypeRegistry(config);
  const types = registry.getDocumentTypes();
  assert.equal(types.length, 0);
  assert.equal(registry.hasDocumentType('prd'), false);
});

