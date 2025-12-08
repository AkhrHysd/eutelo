import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type FrontmatterFieldSchema, type FrontmatterSchemaConfig, type DirectoryFileDefinition } from '@eutelo/core/config';
import frontmatterCoreSchema from '../schemas/frontmatter-core.json' with { type: 'json' };

const presetRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templatesDir = path.join(presetRoot, 'templates');
const promptsDir = path.join(presetRoot, 'prompts');

function templatePath(fileName: string): string {
  return path.join(templatesDir, fileName);
}

function promptPath(fileName: string): string {
  return path.join(promptsDir, fileName);
}

// frontmatterSchemasのkindは、directoryStructureで使用されるkindと一致させる必要がある
// DocumentTypeRegistryは正規化機能を持っているが、スキーマのkindは実際に使用されるkindに合わせる
const defaultFrontmatterKinds = ['prd', 'sub-prd', 'beh', 'sub-beh', 'dsg', 'adr', 'task', 'ops'];

function cloneFields(): Record<string, FrontmatterFieldSchema> {
  return JSON.parse(JSON.stringify(frontmatterCoreSchema.fields)) as Record<string, FrontmatterFieldSchema>;
}

const frontmatterSchemas: FrontmatterSchemaConfig[] = defaultFrontmatterKinds.map((kind) => ({
  kind,
  fields: cloneFields()
}));

export default defineConfig({
  presets: [],
  docsRoot: 'eutelo-docs',
  directoryStructure: {
    // Root directories (no files)
    'product': [],
    'product/features': [],
    'architecture': [],
    'architecture/design': [],
    
    // Feature directories with document templates
    'product/features/{FEATURE}': [
      {
        file: 'PRD-{FEATURE}.md',
        kind: 'prd',
        template: templatePath('_template-prd.md'),
        prefix: 'PRD-',
        variables: ['FEATURE'],
        frontmatterDefaults: {
          type: 'prd',
          parent: '/'
        }
      },
      {
        file: 'BEH-{FEATURE}.md',
        kind: 'beh',
        template: templatePath('_template-beh.md'),
        prefix: 'BEH-',
        variables: ['FEATURE'],
        frontmatterDefaults: {
          type: 'behavior',
          parent: 'PRD-{FEATURE}'
        }
      },
      {
        file: 'SUB-PRD-{SUB}.md',
        kind: 'sub-prd',
        template: templatePath('_template-sub-prd.md'),
        prefix: 'SUB-PRD-',
        variables: ['FEATURE', 'SUB'],
        frontmatterDefaults: {
          type: 'prd',
          parent: 'PRD-{FEATURE}'
        }
      },
      {
        file: 'BEH-{FEATURE}-{SUB}.md',
        kind: 'sub-beh',
        template: templatePath('_template-sub-beh.md'),
        prefix: 'BEH-',
        variables: ['FEATURE', 'SUB'],
        frontmatterDefaults: {
          type: 'behavior',
          parent: 'SUB-PRD-{SUB}'
        }
      }
    ],
    
    // Architecture design directories
    'architecture/design/{FEATURE}': [
      {
        file: 'DSG-{FEATURE}.md',
        kind: 'dsg',
        template: templatePath('_template-dsg.md'),
        prefix: 'DSG-',
        variables: ['FEATURE'],
        frontmatterDefaults: {
          type: 'design',
          parent: 'PRD-{FEATURE}'
        }
      }
    ],
    
    // ADR directory (with sequence numbering) - files directly in adr/
    'architecture/adr': [
      {
        file: 'ADR-{FEATURE}-{SEQUENCE}.md',
        kind: 'adr',
        template: templatePath('_template-adr.md'),
        prefix: 'ADR-',
        variables: ['FEATURE', 'SEQUENCE'],
        frontmatterDefaults: {
          type: 'adr',
          parent: 'PRD-{FEATURE}'
        }
      }
    ],
    
    // Tasks directory - files directly in tasks/
    'tasks': [
      {
        file: 'TASK-{NAME}.md',
        kind: 'task',
        template: templatePath('_template-task.md'),
        prefix: 'TASK-',
        variables: ['NAME'],
        frontmatterDefaults: {
          type: 'task',
          parent: '/'
        }
      }
    ],
    
    // Ops directory - files directly in ops/
    'ops': [
      {
        file: 'OPS-{NAME}.md',
        kind: 'ops',
        template: templatePath('_template-ops.md'),
        prefix: 'OPS-',
        variables: ['NAME'],
        frontmatterDefaults: {
          type: 'ops',
          parent: '/'
        }
      }
    ]
  },
  frontmatter: {
    rootParentIds: ['PRINCIPLE-GLOBAL'],
    schemas: frontmatterSchemas
  },
  guard: {
    prompts: {
      'guard.default': {
        id: 'guard.default',
        templatePath: promptPath('guard-system.md'),
        model: process.env.EUTELO_GUARD_MODEL ?? 'gpt-4o-mini',
        temperature: 0.2
      }
    }
  }
});
