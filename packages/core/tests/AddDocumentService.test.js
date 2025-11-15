import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {
  AddDocumentService,
  FileAlreadyExistsError,
  TemplateNotFoundError,
  TemplateService
} from '../dist/index.js';

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

function createService({ fileSystemAdapter = new MemoryFileSystemAdapter(), templateService, docsRoot } = {}) {
  const service = new AddDocumentService({
    fileSystemAdapter,
    templateService:
      templateService ??
      new StubTemplateService(
        new Map([
          ['_template-prd.md', 'id: {ID}\nparent: {PARENT}\nfeature: {FEATURE}\n']
        ])
      ),
    docsRoot
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
  const service = new AddDocumentService({ fileSystemAdapter: adapter, templateService });
  const result = await service.addDocument({ cwd, type: 'adr', feature: 'AUTH' });
  assert.equal(result.id, 'ADR-AUTH-0004');
  assert.ok(adapter.files.has(path.join(adrDir, 'ADR-AUTH-0004.md')));
});
