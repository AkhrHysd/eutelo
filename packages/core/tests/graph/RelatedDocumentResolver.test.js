import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { RelatedDocumentResolver } from '../../dist/graph/RelatedDocumentResolver.js';
import { DocumentScanner } from '../../dist/graph/DocumentScanner.js';
import { GraphBuilder } from '../../dist/graph/GraphBuilder.js';

/**
 * Fake file system adapter for testing
 */
function createFakeFs(files, rootDir = 'eutelo-docs') {
  // Build directory structure from files
  const directories = new Set([rootDir]);
  for (const file of files) {
    const parts = file.path.split('/');
    let current = rootDir;
    for (let i = 0; i < parts.length - 1; i++) {
      current = `${current}/${parts[i]}`;
      directories.add(current);
    }
  }

  return {
    async exists(targetPath) {
      // Check if it's the root directory or a subdirectory
      if (targetPath.endsWith(rootDir) || directories.has(targetPath.split('/').slice(-2).join('/'))) {
        return true;
      }
      // Check for directory paths
      for (const dir of directories) {
        if (targetPath.endsWith(dir)) {
          return true;
        }
      }
      return files.some(f => targetPath.endsWith(f.path));
    },
    async readDir(targetPath) {
      const entries = new Set();
      
      // Get the relative path within eutelo-docs
      let relativePath = '';
      if (targetPath.includes(rootDir)) {
        const idx = targetPath.indexOf(rootDir);
        relativePath = targetPath.slice(idx + rootDir.length + 1);
      }
      
      for (const file of files) {
        if (relativePath === '') {
          // Root level - get first path component
          const firstPart = file.path.split('/')[0];
          entries.add(firstPart);
        } else if (file.path.startsWith(relativePath + '/')) {
          // Subdirectory - get next path component
          const remaining = file.path.slice(relativePath.length + 1);
          const nextPart = remaining.split('/')[0];
          entries.add(nextPart);
        }
      }
      return Array.from(entries);
    },
    async stat(targetPath) {
      const isFile = files.some(f => targetPath.endsWith(f.path));
      return {
        isDirectory: () => !isFile,
        isFile: () => isFile
      };
    },
    async readFile(targetPath) {
      const file = files.find(f => targetPath.endsWith(f.path));
      if (!file) {
        throw new Error(`File not found: ${targetPath}`);
      }
      return file.content;
    }
  };
}

describe('RelatedDocumentResolver', () => {
  describe('1-1: Type definitions and skeleton', () => {
    it('should be instantiable with required dependencies', () => {
      const fakeFs = createFakeFs([]);
      const scanner = new DocumentScanner({
        fileSystemAdapter: fakeFs,
        docsRoot: 'eutelo-docs'
      });
      const builder = new GraphBuilder();
      
      const resolver = new RelatedDocumentResolver({
        scanner,
        builder
      });
      
      assert.ok(resolver, 'Resolver should be instantiable');
      assert.strictEqual(typeof resolver.resolve, 'function', 'resolve method should exist');
    });

    it('should accept optional cwd parameter in constructor', () => {
      const fakeFs = createFakeFs([]);
      const scanner = new DocumentScanner({
        fileSystemAdapter: fakeFs,
        docsRoot: 'eutelo-docs'
      });
      const builder = new GraphBuilder();
      
      const resolver = new RelatedDocumentResolver({
        scanner,
        builder,
        cwd: '/custom/path'
      });
      
      assert.ok(resolver, 'Resolver should accept cwd');
    });

    it('should throw error when document not found', async () => {
      const fakeFs = createFakeFs([]);
      const scanner = new DocumentScanner({
        fileSystemAdapter: fakeFs,
        docsRoot: 'eutelo-docs'
      });
      const builder = new GraphBuilder();
      const resolver = new RelatedDocumentResolver({
        scanner,
        builder,
        cwd: '/test'
      });

      await assert.rejects(
        async () => resolver.resolve('nonexistent.md'),
        /Document not found/
      );
    });
  });

  describe('1-2: Parent document retrieval', () => {
    it('should retrieve parent document', async () => {
      const files = [
        {
          path: 'product/features/AUTH/PRD-AUTH.md',
          content: `---
id: PRD-AUTH
type: prd
parent: PRD-CORE
feature: AUTH
---
# PRD-AUTH`
        },
        {
          path: 'product/features/CORE/PRD-CORE.md',
          content: `---
id: PRD-CORE
type: prd
parent: /
feature: CORE
---
# PRD-CORE`
        }
      ];

      const fakeFs = createFakeFs(files);
      const scanner = new DocumentScanner({
        fileSystemAdapter: fakeFs,
        docsRoot: 'eutelo-docs'
      });
      const builder = new GraphBuilder();
      const resolver = new RelatedDocumentResolver({
        scanner,
        builder,
        cwd: '/test'
      });

      const result = await resolver.resolve('product/features/AUTH/PRD-AUTH.md');

      assert.strictEqual(result.origin.id, 'PRD-AUTH');
      assert.ok(result.related.some(r => r.id === 'PRD-CORE'), 'Should find parent PRD-CORE');
      assert.ok(result.related.some(r => r.via === 'parent'), 'Relation should be parent');
      assert.ok(result.related.some(r => r.direction === 'upstream'), 'Direction should be upstream');
    });

    it('should not collect parent when parent is "/" (root)', async () => {
      const files = [
        {
          path: 'product/features/CORE/PRD-CORE.md',
          content: `---
id: PRD-CORE
type: prd
parent: /
feature: CORE
---
# PRD-CORE`
        }
      ];

      const fakeFs = createFakeFs(files);
      const scanner = new DocumentScanner({
        fileSystemAdapter: fakeFs,
        docsRoot: 'eutelo-docs'
      });
      const builder = new GraphBuilder();
      const resolver = new RelatedDocumentResolver({
        scanner,
        builder,
        cwd: '/test'
      });

      const result = await resolver.resolve('product/features/CORE/PRD-CORE.md');

      assert.strictEqual(result.origin.id, 'PRD-CORE');
      assert.strictEqual(result.related.length, 0, 'Should not have any related documents');
    });
  });

  describe('1-3: Related document retrieval', () => {
    it('should retrieve related documents in same feature', async () => {
      const files = [
        {
          path: 'product/features/AUTH/PRD-AUTH.md',
          content: `---
id: PRD-AUTH
type: prd
parent: /
feature: AUTH
---
# PRD-AUTH`
        },
        {
          path: 'product/features/AUTH/BEH-AUTH.md',
          content: `---
id: BEH-AUTH
type: beh
parent: PRD-AUTH
feature: AUTH
---
# BEH-AUTH`
        },
        {
          path: 'architecture/design/AUTH/DSG-AUTH.md',
          content: `---
id: DSG-AUTH
type: dsg
parent: PRD-AUTH
feature: AUTH
---
# DSG-AUTH`
        }
      ];

      const fakeFs = createFakeFs(files);
      const scanner = new DocumentScanner({
        fileSystemAdapter: fakeFs,
        docsRoot: 'eutelo-docs'
      });
      const builder = new GraphBuilder();
      const resolver = new RelatedDocumentResolver({
        scanner,
        builder,
        cwd: '/test'
      });

      const result = await resolver.resolve('product/features/AUTH/PRD-AUTH.md');

      assert.strictEqual(result.origin.id, 'PRD-AUTH');
      assert.ok(result.related.some(r => r.id === 'BEH-AUTH'), 'Should find BEH-AUTH');
      assert.ok(result.related.some(r => r.id === 'DSG-AUTH'), 'Should find DSG-AUTH');
    });
  });

  describe('1-4: Depth option', () => {
    it('should respect depth=1 (default)', async () => {
      const files = [
        {
          path: 'product/features/AUTH/SUB-PRD-OAUTH.md',
          content: `---
id: SUB-PRD-OAUTH
type: sub-prd
parent: PRD-AUTH
feature: AUTH
---
# SUB-PRD-OAUTH`
        },
        {
          path: 'product/features/AUTH/PRD-AUTH.md',
          content: `---
id: PRD-AUTH
type: prd
parent: PRD-CORE
feature: AUTH
---
# PRD-AUTH`
        },
        {
          path: 'product/features/CORE/PRD-CORE.md',
          content: `---
id: PRD-CORE
type: prd
parent: /
feature: CORE
---
# PRD-CORE`
        }
      ];

      const fakeFs = createFakeFs(files);
      const scanner = new DocumentScanner({
        fileSystemAdapter: fakeFs,
        docsRoot: 'eutelo-docs'
      });
      const builder = new GraphBuilder();
      const resolver = new RelatedDocumentResolver({
        scanner,
        builder,
        cwd: '/test'
      });

      const result = await resolver.resolve('product/features/AUTH/SUB-PRD-OAUTH.md', { depth: 1 });

      assert.strictEqual(result.origin.id, 'SUB-PRD-OAUTH');
      assert.ok(result.related.some(r => r.id === 'PRD-AUTH'), 'Should find PRD-AUTH at hop 1');
      assert.ok(!result.related.some(r => r.id === 'PRD-CORE'), 'Should NOT find PRD-CORE (hop 2)');
    });

    it('should collect 2 hops with depth=2', async () => {
      const files = [
        {
          path: 'product/features/AUTH/SUB-PRD-OAUTH.md',
          content: `---
id: SUB-PRD-OAUTH
type: sub-prd
parent: PRD-AUTH
feature: AUTH
---
# SUB-PRD-OAUTH`
        },
        {
          path: 'product/features/AUTH/PRD-AUTH.md',
          content: `---
id: PRD-AUTH
type: prd
parent: PRD-CORE
feature: AUTH
---
# PRD-AUTH`
        },
        {
          path: 'product/features/CORE/PRD-CORE.md',
          content: `---
id: PRD-CORE
type: prd
parent: /
feature: CORE
---
# PRD-CORE`
        }
      ];

      const fakeFs = createFakeFs(files);
      const scanner = new DocumentScanner({
        fileSystemAdapter: fakeFs,
        docsRoot: 'eutelo-docs'
      });
      const builder = new GraphBuilder();
      const resolver = new RelatedDocumentResolver({
        scanner,
        builder,
        cwd: '/test'
      });

      const result = await resolver.resolve('product/features/AUTH/SUB-PRD-OAUTH.md', { depth: 2 });

      assert.strictEqual(result.origin.id, 'SUB-PRD-OAUTH');
      assert.ok(result.related.some(r => r.id === 'PRD-AUTH' && r.hop === 1), 'Should find PRD-AUTH at hop 1');
      assert.ok(result.related.some(r => r.id === 'PRD-CORE' && r.hop === 2), 'Should find PRD-CORE at hop 2');
    });
  });

  describe('1-5: All option', () => {
    it('should collect all related with all=true', async () => {
      const files = [
        {
          path: 'product/features/AUTH/LEAF.md',
          content: `---
id: LEAF
type: sub-prd
parent: LEVEL-3
feature: AUTH
---
# LEAF`
        },
        {
          path: 'product/features/AUTH/LEVEL-3.md',
          content: `---
id: LEVEL-3
type: sub-prd
parent: LEVEL-2
feature: AUTH
---
# LEVEL-3`
        },
        {
          path: 'product/features/AUTH/LEVEL-2.md',
          content: `---
id: LEVEL-2
type: sub-prd
parent: LEVEL-1
feature: AUTH
---
# LEVEL-2`
        },
        {
          path: 'product/features/AUTH/LEVEL-1.md',
          content: `---
id: LEVEL-1
type: prd
parent: /
feature: AUTH
---
# LEVEL-1`
        }
      ];

      const fakeFs = createFakeFs(files);
      const scanner = new DocumentScanner({
        fileSystemAdapter: fakeFs,
        docsRoot: 'eutelo-docs'
      });
      const builder = new GraphBuilder();
      const resolver = new RelatedDocumentResolver({
        scanner,
        builder,
        cwd: '/test'
      });

      const result = await resolver.resolve('product/features/AUTH/LEAF.md', { all: true });

      assert.strictEqual(result.origin.id, 'LEAF');
      assert.ok(result.related.some(r => r.id === 'LEVEL-3' && r.hop === 1), 'Should find LEVEL-3');
      assert.ok(result.related.some(r => r.id === 'LEVEL-2' && r.hop === 2), 'Should find LEVEL-2');
      assert.ok(result.related.some(r => r.id === 'LEVEL-1' && r.hop === 3), 'Should find LEVEL-1');
      assert.strictEqual(result.stats.maxHop, 3, 'Max hop should be 3');
    });
  });

  describe('1-6: Direction option', () => {
    it('should only collect upstream with direction=upstream', async () => {
      const files = [
        {
          path: 'product/features/AUTH/PRD-AUTH.md',
          content: `---
id: PRD-AUTH
type: prd
parent: PRD-CORE
feature: AUTH
---
# PRD-AUTH`
        },
        {
          path: 'product/features/CORE/PRD-CORE.md',
          content: `---
id: PRD-CORE
type: prd
parent: /
feature: CORE
---
# PRD-CORE`
        },
        {
          path: 'product/features/AUTH/BEH-AUTH.md',
          content: `---
id: BEH-AUTH
type: beh
parent: PRD-AUTH
feature: AUTH
---
# BEH-AUTH`
        }
      ];

      const fakeFs = createFakeFs(files);
      const scanner = new DocumentScanner({
        fileSystemAdapter: fakeFs,
        docsRoot: 'eutelo-docs'
      });
      const builder = new GraphBuilder();
      const resolver = new RelatedDocumentResolver({
        scanner,
        builder,
        cwd: '/test'
      });

      const result = await resolver.resolve('product/features/AUTH/PRD-AUTH.md', {
        direction: 'upstream',
        depth: 2
      });

      assert.ok(result.related.some(r => r.id === 'PRD-CORE'), 'Should find upstream PRD-CORE');
      assert.ok(!result.related.some(r => r.id === 'BEH-AUTH'), 'Should NOT find downstream BEH-AUTH');
    });

    it('should only collect downstream with direction=downstream', async () => {
      const files = [
        {
          path: 'product/features/AUTH/PRD-AUTH.md',
          content: `---
id: PRD-AUTH
type: prd
parent: PRD-CORE
feature: AUTH
---
# PRD-AUTH`
        },
        {
          path: 'product/features/CORE/PRD-CORE.md',
          content: `---
id: PRD-CORE
type: prd
parent: /
feature: CORE
---
# PRD-CORE`
        },
        {
          path: 'product/features/AUTH/BEH-AUTH.md',
          content: `---
id: BEH-AUTH
type: beh
parent: PRD-AUTH
feature: AUTH
---
# BEH-AUTH`
        }
      ];

      const fakeFs = createFakeFs(files);
      const scanner = new DocumentScanner({
        fileSystemAdapter: fakeFs,
        docsRoot: 'eutelo-docs'
      });
      const builder = new GraphBuilder();
      const resolver = new RelatedDocumentResolver({
        scanner,
        builder,
        cwd: '/test'
      });

      const result = await resolver.resolve('product/features/AUTH/PRD-AUTH.md', {
        direction: 'downstream',
        depth: 2
      });

      assert.ok(!result.related.some(r => r.id === 'PRD-CORE'), 'Should NOT find upstream PRD-CORE');
      assert.ok(result.related.some(r => r.id === 'BEH-AUTH'), 'Should find downstream BEH-AUTH');
    });
  });

  describe('1-7: Circular reference detection', () => {
    it('should detect and handle circular references', async () => {
      const files = [
        {
          path: 'product/features/AUTH/DOC-A.md',
          content: `---
id: DOC-A
type: prd
parent: /
related: [DOC-B]
feature: AUTH
---
# DOC-A`
        },
        {
          path: 'product/features/AUTH/DOC-B.md',
          content: `---
id: DOC-B
type: prd
parent: /
related: [DOC-A]
feature: AUTH
---
# DOC-B`
        }
      ];

      const fakeFs = createFakeFs(files);
      const scanner = new DocumentScanner({
        fileSystemAdapter: fakeFs,
        docsRoot: 'eutelo-docs'
      });
      const builder = new GraphBuilder();
      const resolver = new RelatedDocumentResolver({
        scanner,
        builder,
        cwd: '/test'
      });

      const result = await resolver.resolve('product/features/AUTH/DOC-A.md', { depth: 3 });

      // Should not hang due to circular reference
      assert.ok(result.related.some(r => r.id === 'DOC-B'), 'Should find DOC-B');
      // Each document should only appear once
      const docBCount = result.related.filter(r => r.id === 'DOC-B').length;
      assert.strictEqual(docBCount, 1, 'DOC-B should appear only once');
      // Should have warning about circular reference
      assert.ok(result.warnings.some(w => w.includes('Circular reference')), 'Should warn about circular reference');
    });
  });

  describe('1-8: Non-existent parent handling', () => {
    it('should warn when parent document does not exist', async () => {
      const files = [
        {
          path: 'product/features/AUTH/PRD-AUTH.md',
          content: `---
id: PRD-AUTH
type: prd
parent: PRD-NOTFOUND
feature: AUTH
---
# PRD-AUTH`
        }
      ];

      const fakeFs = createFakeFs(files);
      const scanner = new DocumentScanner({
        fileSystemAdapter: fakeFs,
        docsRoot: 'eutelo-docs'
      });
      const builder = new GraphBuilder();
      const resolver = new RelatedDocumentResolver({
        scanner,
        builder,
        cwd: '/test'
      });

      const result = await resolver.resolve('product/features/AUTH/PRD-AUTH.md');

      assert.strictEqual(result.origin.id, 'PRD-AUTH');
      assert.ok(
        result.warnings.some(w => w.includes('PRD-NOTFOUND')),
        'Should warn about non-existent parent'
      );
    });
  });

  describe('Stats computation', () => {
    it('should compute correct stats', async () => {
      const files = [
        {
          path: 'product/features/AUTH/PRD-AUTH.md',
          content: `---
id: PRD-AUTH
type: prd
parent: /
feature: AUTH
---
# PRD-AUTH`
        },
        {
          path: 'product/features/AUTH/BEH-AUTH.md',
          content: `---
id: BEH-AUTH
type: beh
parent: PRD-AUTH
feature: AUTH
---
# BEH-AUTH`
        },
        {
          path: 'architecture/design/AUTH/DSG-AUTH.md',
          content: `---
id: DSG-AUTH
type: dsg
parent: PRD-AUTH
feature: AUTH
---
# DSG-AUTH`
        }
      ];

      const fakeFs = createFakeFs(files);
      const scanner = new DocumentScanner({
        fileSystemAdapter: fakeFs,
        docsRoot: 'eutelo-docs'
      });
      const builder = new GraphBuilder();
      const resolver = new RelatedDocumentResolver({
        scanner,
        builder,
        cwd: '/test'
      });

      const result = await resolver.resolve('product/features/AUTH/PRD-AUTH.md');

      assert.strictEqual(result.stats.totalFound, 2, 'Should find 2 related documents');
      assert.strictEqual(result.stats.maxHop, 1, 'Max hop should be 1');
      assert.ok(result.stats.byRelation.parent >= 2, 'Should have parent relations');
    });
  });
});

