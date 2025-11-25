import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { GraphService } from '../dist/index.js';

function writeDoc(root, relativePath, frontmatterLines, body = '# Body') {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const frontmatter = ['---', ...frontmatterLines, '---', '', body, ''].join('\n');
  fs.writeFileSync(target, frontmatter, 'utf8');
  return target;
}

function setupWorkspace(builder) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-graph-'));
  builder(cwd);
  return cwd;
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

test('GraphService builds graph with parent/child relationships', async () => {
  const cwd = setupWorkspace((root) => {
    const docsRoot = path.join(root, 'eutelo-docs');
    writeDoc(path.join(docsRoot, 'product/features/AUTH'), 'PRD-AUTH.md', [
      'id: PRD-AUTH',
      'type: prd',
      'feature: AUTH',
      'title: Auth Spec',
      'purpose: Define auth',
      'parent: PRD-EUTELO-CORE'
    ]);
    writeDoc(path.join(docsRoot, 'product/features/AUTH'), 'BEH-AUTH.md', [
      'id: BEH-AUTH',
      'type: beh',
      'feature: AUTH',
      'title: Auth Behavior',
      'purpose: Observe auth',
      'parent: PRD-AUTH'
    ]);
  });

  const service = new GraphService();
  try {
    const graph = await service.buildGraph({ cwd });
    assert.equal(graph.nodes.length, 2);
    assert.equal(graph.edges.length, 1);
    const prdNode = graph.nodes.find((node) => node.id === 'PRD-AUTH');
    assert.ok(prdNode, 'PRD node should exist');
    const behNode = graph.nodes.find((node) => node.id === 'BEH-AUTH');
    assert.ok(behNode, 'BEH node should exist');
    assert.ok(graph.integrity.danglingEdges.some((edge) => edge.to === 'PRD-AUTH'));
  } finally {
    cleanup(cwd);
  }
});

test('GraphService describeNode and impact traverse neighbors', async () => {
  const cwd = setupWorkspace((root) => {
    const docs = path.join(root, 'eutelo-docs');
    writeDoc(path.join(docs, 'product/features/AUTH'), 'PRD-AUTH.md', [
      'id: PRD-AUTH',
      'type: prd',
      'feature: AUTH',
      'purpose: Parent doc',
      'parent: PRD-EUTELO-CORE'
    ]);
    writeDoc(path.join(docs, 'product/features/AUTH'), 'BEH-AUTH.md', [
      'id: BEH-AUTH',
      'type: beh',
      'feature: AUTH',
      'purpose: Behavior',
      'parent: PRD-AUTH'
    ]);
    writeDoc(path.join(docs, 'architecture/design/AUTH'), 'DSG-AUTH.md', [
      'id: DSG-AUTH',
      'type: dsg',
      'feature: AUTH',
      'purpose: Design',
      'parent: PRD-AUTH'
    ]);
  });

  const service = new GraphService();
  try {
    const detail = await service.describeNode({ cwd, documentIdOrPath: 'PRD-AUTH' });
    assert.equal(detail.children.length, 2);
    const childIds = detail.children.map((edge) => edge.to).sort();
    assert.deepEqual(childIds, ['BEH-AUTH', 'DSG-AUTH']);

    const impact = await service.analyzeImpact({ cwd, documentIdOrPath: 'BEH-AUTH', impact: { maxDepth: 2 } });
    assert.equal(impact.node.id, 'BEH-AUTH');
    assert.ok(impact.findings.some((entry) => entry.id === 'PRD-AUTH'));
  } finally {
    cleanup(cwd);
  }
});

test('GraphService builds parent edges based on schema relation markers', async () => {
  const cwd = setupWorkspace((root) => {
    const docsRoot = path.join(root, 'docs');
    writeDoc(docsRoot, 'specs/SPEC-ROOT.md', [
      'id: SPEC-ROOT',
      'type: spec',
      'title: Root Doc',
      'purpose: Root purpose'
    ]);
    writeDoc(docsRoot, 'specs/SPEC-CHILD.md', [
      'id: SPEC-CHILD',
      'type: spec',
      'title: Child Doc',
      'purpose: Child purpose',
      'parentDocument: SPEC-ROOT'
    ]);
  });

  const service = new GraphService({
    docsRoot: 'docs',
    frontmatterSchemas: [
      {
        kind: 'spec',
        fields: {
          id: { type: 'string', required: true },
          type: { type: 'string', required: true },
          parentDocument: { type: 'string', relation: 'parent' }
        }
      }
    ],
    scaffold: {
      'document.spec': {
        id: 'document.spec',
        kind: 'spec',
        path: 'specs/{ID}.md',
        template: '_template-spec.md'
      }
    }
  });

  try {
    const graph = await service.buildGraph({ cwd });
    const parentEdge = graph.edges.find(
      (edge) => edge.relation === 'parent' && edge.from === 'SPEC-ROOT' && edge.to === 'SPEC-CHILD'
    );
    assert.ok(parentEdge, 'parent relation should be derived from schema relation metadata');
  } finally {
    cleanup(cwd);
  }
});

test('GraphService records warnings for unknown document types', async () => {
  const scaffold = {
    'document.prd': {
      id: 'document.prd',
      kind: 'prd',
      path: 'product/features/{FEATURE}/PRD-{FEATURE}.md',
      template: '_template-prd.md'
    }
  };
  const frontmatterSchemas = [
    {
      kind: 'prd',
      fields: {
        id: { type: 'string', required: true },
        type: { type: 'string', required: true }
      }
    }
  ];
  const service = new GraphService({
    scaffold,
    frontmatterSchemas
  });
  const cwd = setupWorkspace((root) => {
    writeDoc(path.join(root, 'eutelo-docs'), 'custom/UNKNOWN-TYPE.md', [
      'id: UNKNOWN-TYPE',
      'type: unknown-type',
      'purpose: Test'
    ]);
  });
  try {
    const graph = await service.buildGraph({ cwd });
    // Unknown document type should still be included in graph
    const unknownNode = graph.nodes.find((node) => node.id === 'UNKNOWN-TYPE');
    assert.ok(unknownNode, 'Unknown document type should be included in graph');
    // But should have warnings
    assert.ok(unknownNode.warnings && unknownNode.warnings.length > 0, 'Should have warnings');
    const hasUnknownTypeWarning = unknownNode.warnings.some((w) =>
      w.includes('Unknown document type')
    );
    assert.ok(hasUnknownTypeWarning, 'Should warn about unknown document type');
  } finally {
    cleanup(cwd);
  }
});

test('GraphService includes registered document types in graph', async () => {
  const scaffold = {
    'document.custom': {
      id: 'document.custom',
      kind: 'custom',
      path: 'custom/{FEATURE}/CUSTOM-{FEATURE}.md',
      template: '_template-custom.md'
    }
  };
  const frontmatterSchemas = [
    {
      kind: 'custom',
      fields: {
        id: { type: 'string', required: true },
        type: { type: 'string', required: true }
      }
    }
  ];
  const service = new GraphService({
    scaffold,
    frontmatterSchemas
  });
  const cwd = setupWorkspace((root) => {
    writeDoc(path.join(root, 'eutelo-docs'), 'custom/CUSTOM-TEST.md', [
      'id: CUSTOM-TEST',
      'type: custom',
      'purpose: Test'
    ]);
  });
  try {
    const graph = await service.buildGraph({ cwd });
    const customNode = graph.nodes.find((node) => node.id === 'CUSTOM-TEST');
    assert.ok(customNode, 'Registered custom document type should be in graph');
    assert.equal(customNode.type, 'custom');
    // Should not have warnings for registered types
    const hasWarnings = customNode.warnings && customNode.warnings.length > 0;
    const hasUnknownTypeWarning =
      hasWarnings && customNode.warnings.some((w) => w.includes('Unknown document type'));
    assert.equal(hasUnknownTypeWarning, false, 'Registered types should not have unknown type warnings');
  } finally {
    cleanup(cwd);
  }
});
