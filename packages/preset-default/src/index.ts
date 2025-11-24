import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type FrontmatterFieldSchema, type FrontmatterSchemaConfig } from '@eutelo/core/config';
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

const defaultFrontmatterKinds = ['prd', 'sub-prd', 'behavior', 'sub-behavior', 'design', 'sub-design', 'adr', 'task', 'ops'];

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
  scaffold: {
    'document.prd': {
      id: 'document.prd',
      kind: 'prd',
      path: 'product/features/{FEATURE}/PRD-{FEATURE}.md',
      template: templatePath('_template-prd.md'),
      variables: {
        ID: 'PRD-{FEATURE}',
        PARENT: 'PRINCIPLE-GLOBAL'
      }
    },
    'document.beh': {
      id: 'document.beh',
      kind: 'beh',
      path: 'product/features/{FEATURE}/BEH-{FEATURE}.md',
      template: templatePath('_template-beh.md'),
      variables: {
        ID: 'BEH-{FEATURE}',
        PARENT: 'PRD-{FEATURE}'
      }
    },
    'document.sub-prd': {
      id: 'document.sub-prd',
      kind: 'sub-prd',
      path: 'product/features/{FEATURE}/SUB-PRD-{SUB}.md',
      template: templatePath('_template-sub-prd.md'),
      variables: {
        ID: 'SUB-PRD-{SUB}',
        PARENT: 'PRD-{FEATURE}'
      }
    },
    'document.sub-beh': {
      id: 'document.sub-beh',
      kind: 'sub-beh',
      path: 'product/features/{FEATURE}/BEH-{FEATURE}-{SUB}.md',
      template: templatePath('_template-sub-beh.md'),
      variables: {
        ID: 'BEH-{FEATURE}-{SUB}',
        PARENT: 'SUB-PRD-{SUB}'
      }
    },
    'document.dsg': {
      id: 'document.dsg',
      kind: 'dsg',
      path: 'architecture/design/{FEATURE}/DSG-{FEATURE}.md',
      template: templatePath('_template-dsg.md'),
      variables: {
        ID: 'DSG-{FEATURE}',
        PARENT: 'PRD-{FEATURE}'
      }
    },
    'document.adr': {
      id: 'document.adr',
      kind: 'adr',
      path: 'architecture/adr/ADR-{FEATURE}-{SEQUENCE}.md',
      template: templatePath('_template-adr.md'),
      variables: {
        ID: 'ADR-{FEATURE}-{SEQUENCE}',
        PARENT: 'PRD-{FEATURE}'
      }
    },
    'document.task': {
      id: 'document.task',
      kind: 'task',
      path: 'tasks/TASK-{NAME}.md',
      template: templatePath('_template-task.md'),
      variables: {
        ID: 'TASK-{NAME}'
      }
    },
    'document.ops': {
      id: 'document.ops',
      kind: 'ops',
      path: 'ops/OPS-{NAME}.md',
      template: templatePath('_template-ops.md'),
      variables: {
        ID: 'OPS-{NAME}'
      }
    }
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
        model: process.env.EUTELO_GUARD_DEFAULT_MODEL ?? 'gpt-4o-mini',
        temperature: 0.2
      }
    }
  }
});
