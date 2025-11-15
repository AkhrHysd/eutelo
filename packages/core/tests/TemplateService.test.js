import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { TemplateNotFoundError, TemplateService } from '../dist/index.js';

function createTemplateRoot(templateContent) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-template-service-'));
  fs.writeFileSync(path.join(dir, '_template-sample.md'), templateContent);
  return dir;
}

test('TemplateService fills placeholders from context', async () => {
  const root = createTemplateRoot(
    'id: {ID}\nfeature: {FEATURE}\nsub: {SUB}\nparent: {PARENT}\ndate: {DATE}\n'
  );
  try {
    const service = new TemplateService({ templateRoot: root });
    const output = await service.render('_template-sample.md', {
      ID: 'DOC-001',
      FEATURE: 'auth',
      SUB: 'login',
      DATE: '2025-01-01',
      PARENT: 'PRD-AUTH'
    });

    assert.match(output, /id: DOC-001/);
    assert.match(output, /feature: auth/);
    assert.match(output, /sub: login/);
    assert.match(output, /parent: PRD-AUTH/);
    assert.match(output, /date: 2025-01-01/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('TemplateService throws TemplateNotFoundError for unknown templates', async () => {
  const root = createTemplateRoot('id: {ID}\n');
  try {
    const service = new TemplateService({ templateRoot: root });
    await assert.rejects(
      () => service.render('missing.md', { ID: 'DOC-001' }),
      TemplateNotFoundError
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
