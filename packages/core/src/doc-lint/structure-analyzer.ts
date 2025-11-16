import path from 'node:path';
import { resolveDocsRoot } from '../constants/docsRoot.js';

export type StructureExpectation = {
  type: string;
  feature?: string;
  idPattern: RegExp;
};

export type AnalyzeStructureOptions = {
  docsRoot?: string;
};

const PATTERNS: Array<{ regex: RegExp; type: string; featureIndex?: number; idPattern: RegExp }> = [
  {
    regex: /^product\/features\/([^/]+)\/PRD-[^/]+\.md$/i,
    type: 'prd',
    featureIndex: 1,
    idPattern: /^PRD-[A-Z0-9-]+$/
  },
  {
    regex: /^product\/features\/([^/]+)\/SUB-PRD-[^/]+\.md$/i,
    type: 'sub-prd',
    featureIndex: 1,
    idPattern: /^SUB-PRD-[A-Z0-9-]+$/
  },
  {
    regex: /^product\/features\/([^/]+)\/BEH-[^/]+\.md$/i,
    type: 'behavior',
    featureIndex: 1,
    idPattern: /^BEH-[A-Z0-9-]+$/
  },
  {
    regex: /^product\/features\/([^/]+)\/SUB-BEH-[^/]+\.md$/i,
    type: 'sub-behavior',
    featureIndex: 1,
    idPattern: /^SUB-BEH-[A-Z0-9-]+$/
  },
  {
    regex: /^architecture\/design\/([^/]+)\/DSG-[^/]+\.md$/i,
    type: 'design',
    featureIndex: 1,
    idPattern: /^DSG-[A-Z0-9-]+$/
  },
  {
    regex: /^architecture\/design\/([^/]+)\/DSG-[^/]+-[^/]+\.md$/i,
    type: 'sub-design',
    featureIndex: 1,
    idPattern: /^DSG-[A-Z0-9-]+-[A-Z0-9-]+$/
  },
  {
    regex: /^architecture\/adr\/ADR-[^/]+\.md$/i,
    type: 'adr',
    idPattern: /^ADR-[A-Z0-9-]+$/
  },
  {
    regex: /^tasks\/TASK-[^/]+\.md$/i,
    type: 'task',
    idPattern: /^TASK-[A-Z0-9-]+$/
  },
  {
    regex: /^ops\/OPS-[^/]+\.md$/i,
    type: 'ops',
    idPattern: /^OPS-[A-Z0-9-]+$/
  }
];

export function analyzeStructure(filePath: string, options: AnalyzeStructureOptions = {}): StructureExpectation | null {
  const docsRoot = options.docsRoot ?? resolveDocsRoot();
  const normalized = normalizePath(path.relative(docsRoot, filePath));

  for (const pattern of PATTERNS) {
    const match = normalized.match(pattern.regex);
    if (!match) continue;
    const feature = pattern.featureIndex ? match[pattern.featureIndex] : undefined;
    return { type: pattern.type, feature, idPattern: pattern.idPattern };
  }

  return null;
}

export function resolveParentPath(parentId: string, docsRoot: string = resolveDocsRoot()): string | null {
  if (/^PRD-[A-Z0-9-]+$/.test(parentId)) {
    const feature = parentId.slice('PRD-'.length).toLowerCase();
    return path.join(docsRoot, 'product', 'features', feature, `${parentId}.md`);
  }
  if (/^BEH-[A-Z0-9-]+$/.test(parentId)) {
    const feature = parentId.slice('BEH-'.length).toLowerCase();
    return path.join(docsRoot, 'product', 'features', feature, `${parentId}.md`);
  }
  if (/^DSG-[A-Z0-9-]+/.test(parentId)) {
    const feature = parentId.slice('DSG-'.length).split('-')[0]?.toLowerCase();
    return feature
      ? path.join(docsRoot, 'architecture', 'design', feature, `${parentId}.md`)
      : path.join(docsRoot, 'architecture', 'design', `${parentId}.md`);
  }
  if (/^ADR-[A-Z0-9-]+$/.test(parentId)) {
    return path.join(docsRoot, 'architecture', 'adr', `${parentId}.md`);
  }
  if (/^TASK-[A-Z0-9-]+$/.test(parentId)) {
    return path.join(docsRoot, 'tasks', `${parentId}.md`);
  }
  if (/^OPS-[A-Z0-9-]+$/.test(parentId)) {
    return path.join(docsRoot, 'ops', `${parentId}.md`);
  }
  return null;
}

function normalizePath(p: string): string {
  return p.replaceAll('\\', '/');
}
