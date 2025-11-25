import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {
  AddDocumentService,
  FileAlreadyExistsError,
  TemplateNotFoundError,
  TemplateService,
  DocumentTypeNotFoundError
} from '../dist/index.js';

const DEFAULT_SCAFFOLD = {
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
  'document.sub-prd': {
    id: 'document.sub-prd',
    kind: 'sub-prd',
    path: 'product/features/{FEATURE}/SUB-PRD-{SUB}.md',
    template: '_template-sub-prd.md',
    variables: {
      ID: 'SUB-PRD-{SUB}',
      PARENT: 'PRD-{FEATURE}'
    }
  },
  'document.sub-beh': {
    id: 'document.sub-beh',
    kind: 'sub-beh',
    path: 'product/features/{FEATURE}/BEH-{FEATURE}-{SUB}.md',
    template: '_template-sub-beh.md',
    variables: {
      ID: 'BEH-{FEATURE}-{SUB}',
      PARENT: 'SUB-PRD-{SUB}'
    }
  },
  'document.dsg': {
    id: 'document.dsg',
    kind: 'dsg',
    path: 'architecture/design/{FEATURE}/DSG-{FEATURE}.md',
    template: '_template-dsg.md',
    variables: {
      ID: 'DSG-{FEATURE}',
      PARENT: 'PRD-{FEATURE}'
    }
  },
  'document.adr': {
    id: 'document.adr',
    kind: 'adr',
    path: 'architecture/adr/ADR-{FEATURE}-{SEQUENCE}.md',
    template: '_template-adr.md',
    variables: {
      ID: 'ADR-{FEATURE}-{SEQUENCE}',
      PARENT: 'PRD-{FEATURE}'
    }
  },
  'document.task': {
    id: 'document.task',
    kind: 'task',
    path: 'tasks/TASK-{NAME}.md',
    template: '_template-task.md',
    variables: {
      ID: 'TASK-{NAME}'
    }
  },
  'document.ops': {
    id: 'document.ops',
    kind: 'ops',
    path: 'ops/OPS-{NAME}.md',
    template: '_template-ops.md',
    variables: {
      ID: 'OPS-{NAME}'
    }
  }
};

class MemoryFileSystemAdapter {
  constructor(files = new Map()) {
    this.files = files;
    this.directories = new Set();
  }

  async exists(targetPath) {
    return this.files.has(targetPath) || this.directories.has(targetPath);
  }

  async mkdirp(targetPath) {
    this.directories.add(targetPath);
  }

  async writeIfNotExists(targetPath, content) {
    if (this.files.has(targetPath)) {
      return { written: false, skipped: true };
    }
    this.files.set(targetPath, content);
    this.directories.add(path.dirname(targetPath));
    return { written: true, skipped: false };
  }

  async readDir(targetPath) {
    const normalized = targetPath.endsWith(path.sep) ? targetPath : `${targetPath}${path.sep}`;
    const result = new Set();
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(normalized)) {
        const relative = filePath.slice(normalized.length);
        if (relative.includes(path.sep)) {
          result.add(relative.split(path.sep)[0]);
        } else {
          result.add(relative);
        }
      }
    }
    return Array.from(result);
  }
}

class StubTemplateService {
  constructor(templates = new Map()) {
    this.templates = templates;
  }

  async render(templateName, context) {
    if (!this.templates.has(templateName)) {
      throw new TemplateNotFoundError(templateName);
    }
    let content = this.templates.get(templateName) ?? '';
    for (const [key, value] of Object.entries(context)) {
      content = content.replaceAll(`{${key}}`, value ?? '');
    }
    return content;
  }
}

function createService({
  fileSystemAdapter = new MemoryFileSystemAdapter(),
  templateService,
  docsRoot,
  scaffold = DEFAULT_SCAFFOLD
} = {}) {
  const service = new AddDocumentService({
    fileSystemAdapter,
    templateService:
      templateService ??
      new StubTemplateService(
        new Map([
          ['_template-prd.md', 'id: {ID}\nparent: {PARENT}\nfeature: {FEATURE}\n']
        ])
      ),
    docsRoot,
    scaffold
  });
  return { service, fileSystemAdapter };
}

test('resolveOutputPath returns design path for DSG documents', () => {
  const { service } = createService();
  const cwd = '/tmp/project';
  const output = service.resolveOutputPath({
    cwd,
    type: 'dsg',
    feature: 'AUTH'
  });
  assert.equal(output, path.join(cwd, 'eutelo-docs', 'architecture', 'design', 'AUTH', 'DSG-AUTH.md'));
});

test('resolveOutputPath honors custom docs root', () => {
  const { service } = createService({ docsRoot: 'custom-docs' });
  const cwd = '/tmp/project';
  const output = service.resolveOutputPath({
    cwd,
    type: 'prd',
    feature: 'AUTH'
  });
  assert.equal(output, path.join(cwd, 'custom-docs', 'product', 'features', 'AUTH', 'PRD-AUTH.md'));
});

test('addDocument throws TemplateNotFoundError when template is missing', async () => {
  const { service } = createService({ templateService: new StubTemplateService() });
  await assert.rejects(
    () => service.addDocument({ cwd: '/tmp/project', type: 'prd', feature: 'AUTH' }),
    TemplateNotFoundError
  );
});

test('addDocument throws FileAlreadyExistsError when file already exists', async () => {
  const existingPath = path.join('/tmp/project', 'eutelo-docs/product/features/AUTH/PRD-AUTH.md');
  const adapter = new MemoryFileSystemAdapter(new Map([[existingPath, 'original']]));
  const { service } = createService({ fileSystemAdapter: adapter });
  await assert.rejects(
    () => service.addDocument({ cwd: '/tmp/project', type: 'prd', feature: 'AUTH' }),
    FileAlreadyExistsError
  );
});

test('ADR sequence increments by scanning existing files', async () => {
  const cwd = '/tmp/project';
  const adrDir = path.join(cwd, 'eutelo-docs/architecture/adr');
  const existing = new Map([
    [path.join(adrDir, 'ADR-AUTH-0001.md'), ''],
    [path.join(adrDir, 'ADR-AUTH-0003.md'), '']
  ]);
  const adapter = new MemoryFileSystemAdapter(existing);
  const templateRoot = path.join(cwd, 'templates');
  const templateService = new StubTemplateService(
    new Map([['_template-adr.md', 'id: {ID}\n']])
  );
  const service = new AddDocumentService({
    fileSystemAdapter: adapter,
    templateService,
    scaffold: DEFAULT_SCAFFOLD
  });
  const result = await service.addDocument({ cwd, type: 'adr', feature: 'AUTH' });
  assert.equal(result.id, 'ADR-AUTH-0004');
  assert.ok(adapter.files.has(path.join(adrDir, 'ADR-AUTH-0004.md')));
});

test('getBlueprint throws DocumentTypeNotFoundError for unknown type', () => {
  const { service } = createService();
  assert.throws(
    () => service.resolveOutputPath({ cwd: '/tmp', type: 'unknown-type', feature: 'AUTH' }),
    DocumentTypeNotFoundError
  );
});

test('getBlueprint throws DocumentTypeNotFoundError with available types list', () => {
  const { service } = createService();
  try {
    service.resolveOutputPath({ cwd: '/tmp', type: 'unknown-type', feature: 'AUTH' });
    assert.fail('Expected DocumentTypeNotFoundError');
  } catch (error) {
    assert.ok(error instanceof DocumentTypeNotFoundError);
    assert.equal(error.documentType, 'unknown-type');
    assert.ok(Array.isArray(error.availableTypes));
    assert.ok(error.availableTypes.length > 0);
    assert.ok(error.message.includes('Available types:'));
  }
});

test('getBlueprint finds scaffold by kind', () => {
  const { service } = createService();
  const output = service.resolveOutputPath({
    cwd: '/tmp',
    type: 'prd',
    feature: 'AUTH'
  });
  assert.ok(output.includes('PRD-AUTH.md'));
});

test('getBlueprint finds scaffold by scaffoldId', () => {
  const { service } = createService();
  const output = service.resolveOutputPath({
    cwd: '/tmp',
    scaffoldId: 'document.prd',
    feature: 'AUTH'
  });
  assert.ok(output.includes('PRD-AUTH.md'));
});

test('getBlueprint throws DocumentTypeNotFoundError for unknown scaffoldId', () => {
  const { service } = createService();
  assert.throws(
    () => service.resolveOutputPath({ cwd: '/tmp', scaffoldId: 'unknown.id', feature: 'AUTH' }),
    DocumentTypeNotFoundError
  );
});
