import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DocumentLoader } from '../dist/index.js';

const fsp = fs.promises;

class NodeFsAdapter {
  async readFile(targetPath) {
    return await fsp.readFile(targetPath, 'utf8');
  }
}

function writeDoc(root, relativePath, frontmatterLines, body = '# Body') {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const content = ['---', ...frontmatterLines, '---', '', body, ''].join('\n');
  fs.writeFileSync(target, content, 'utf8');
  return target;
}

function createWorkspace(structureBuilder) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-guard-loader-'));
  structureBuilder(cwd);
  return cwd;
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

test('DocumentLoader loads PRD files with parsed frontmatter and content', async () => {
  const adapter = new NodeFsAdapter();
  const loader = new DocumentLoader({ fileSystemAdapter: adapter });
  const cwd = createWorkspace((root) => {
    writeDoc(root, 'docs/product/features/AUTH/PRD-AUTH.md', [
      'id: PRD-AUTH',
      'type: prd',
      'feature: AUTH',
      'purpose: Authenticate users',
      'parent: PRINCIPLE-GLOBAL'
    ]);
  });
  try {
    const docs = await loader.loadDocuments({
      cwd,
      paths: ['docs/product/features/AUTH/PRD-AUTH.md']
    });
    assert.equal(docs.length, 1);
    const doc = docs[0];
    assert.equal(doc.id, 'PRD-AUTH');
    assert.equal(doc.type, 'prd');
    assert.match(doc.content, /Body/);
  } finally {
    cleanup(cwd);
  }
});

test('DocumentLoader infers types from filenames', async () => {
  const adapter = new NodeFsAdapter();
  const loader = new DocumentLoader({ fileSystemAdapter: adapter });
  const cwd = createWorkspace((root) => {
    writeDoc(root, 'docs/product/features/AUTH/BEH-AUTH-SIGNIN.md', [
      'id: BEH-AUTH-SIGNIN',
      'feature: AUTH',
      'purpose: Cover sign-in behavior',
      'parent: PRD-AUTH'
    ]);
  });
  try {
    const docs = await loader.loadDocuments({
      cwd,
      paths: ['docs/product/features/AUTH/BEH-AUTH-SIGNIN.md']
    });
    assert.equal(docs[0].type, 'sub-beh');
  } finally {
    cleanup(cwd);
  }
});

test('DocumentLoader throws when mandatory fields are missing', async () => {
  const adapter = new NodeFsAdapter();
  const loader = new DocumentLoader({ fileSystemAdapter: adapter });
  const cwd = createWorkspace((root) => {
    writeDoc(root, 'docs/product/features/AUTH/PRD-AUTH.md', [
      'id: ',
      'type: prd',
      'feature: AUTH',
      'parent: PRINCIPLE-GLOBAL'
    ]);
  });
  try {
    await assert.rejects(
      loader.loadDocuments({
        cwd,
        paths: ['docs/product/features/AUTH/PRD-AUTH.md']
      }),
      /missing required field/i
    );
  } finally {
    cleanup(cwd);
  }
});
