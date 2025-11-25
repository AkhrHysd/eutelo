import path from 'node:path';
import { FileSystemAdapter as DefaultFileSystemAdapter } from '@eutelo/infrastructure';
import { resolveDocsRoot } from '../constants/docsRoot.js';
import { DocumentScanner } from '../graph/DocumentScanner.js';
import { GraphBuilder, type GraphBuildArtifacts } from '../graph/GraphBuilder.js';
import { ImpactAnalyzer, type ImpactAnalysisOptions } from '../graph/ImpactAnalyzer.js';
import { DocumentTypeRegistry } from '../config/DocumentTypeRegistry.js';
import type { FrontmatterSchemaConfig, ScaffoldTemplateConfig, EuteloConfigResolved } from '../config/types.js';
import type {
  DocumentGraph,
  GraphNode,
  GraphEdge,
  ImpactFinding
} from '../graph/types.js';

export type GraphServiceDependencies = {
  fileSystemAdapter?: DefaultFileSystemAdapter;
  docsRoot?: string;
  clock?: () => Date;
  frontmatterSchemas?: FrontmatterSchemaConfig[];
  scaffold?: Record<string, ScaffoldTemplateConfig>;
};

export type BuildGraphOptions = {
  cwd: string;
};

export type NodeNeighborhood = {
  node: GraphNode;
  parents: GraphEdge[];
  children: GraphEdge[];
  related: GraphEdge[];
  mentions: GraphEdge[];
  mentionedBy: GraphEdge[];
};

export type GraphSummary = {
  graph: DocumentGraph;
  topFeatures: Array<{ feature: string; count: number }>;
};

export type ImpactAnalysisResult = {
  node: GraphNode;
  findings: ImpactFinding[];
};

export class GraphService {
  private readonly scanner: DocumentScanner;
  private readonly builder: GraphBuilder;
  private readonly impactAnalyzer: ImpactAnalyzer;
  private readonly clock: () => Date;

  constructor({
    fileSystemAdapter,
    docsRoot = resolveDocsRoot(),
    clock = () => new Date(),
    frontmatterSchemas,
    scaffold
  }: GraphServiceDependencies = {}) {
    const fs = fileSystemAdapter ?? new DefaultFileSystemAdapter();
    
    // Create DocumentTypeRegistry if scaffold is available
    let documentTypeRegistry: DocumentTypeRegistry | null = null;
    if (scaffold && frontmatterSchemas) {
      const config: EuteloConfigResolved = {
        presets: [],
        docsRoot,
        scaffold,
        frontmatter: {
          schemas: frontmatterSchemas,
          rootParentIds: []
        },
        guard: {
          prompts: {}
        },
        sources: {
          cwd: '',
          layers: []
        }
      };
      documentTypeRegistry = new DocumentTypeRegistry(config);
    }
    
    this.scanner = new DocumentScanner({
      fileSystemAdapter: fs,
      docsRoot,
      frontmatterSchemas,
      scaffold,
      documentTypeRegistry
    });
    this.builder = new GraphBuilder();
    this.impactAnalyzer = new ImpactAnalyzer();
    this.clock = clock;
  }

  async buildGraph(options: BuildGraphOptions): Promise<DocumentGraph> {
    const { graph } = await this.loadGraphArtifacts(options.cwd);
    return graph;
  }

  async summarize(options: BuildGraphOptions): Promise<GraphSummary> {
    const { graph } = await this.loadGraphArtifacts(options.cwd);
    const topFeatures = Object.entries(graph.stats.byFeature)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([feature, count]) => ({ feature, count }));
    return { graph, topFeatures };
  }

  async describeNode(options: BuildGraphOptions & { documentIdOrPath: string }): Promise<NodeNeighborhood> {
    const artifacts = await this.loadGraphArtifacts(options.cwd);
    const nodeId = resolveNodeId(options.documentIdOrPath, artifacts);
    if (!nodeId) {
      throw new Error(`Document not found: ${options.documentIdOrPath}`);
    }
    const node = artifacts.nodeMap.get(nodeId);
    if (!node) {
      throw new Error(`Document not found: ${options.documentIdOrPath}`);
    }
    const incoming = artifacts.adjacency.incoming[nodeId] ?? [];
    const outgoing = artifacts.adjacency.outgoing[nodeId] ?? [];

    return {
      node,
      parents: incoming.filter((edge) => edge.relation === 'parent'),
      children: outgoing.filter((edge) => edge.relation === 'parent'),
      related: outgoing.filter((edge) => edge.relation === 'related'),
      mentions: outgoing.filter((edge) => edge.relation === 'mentions'),
      mentionedBy: incoming.filter((edge) => edge.relation === 'mentions')
    };
  }

  async analyzeImpact(
    options: BuildGraphOptions & { documentIdOrPath: string; impact?: ImpactAnalysisOptions }
  ): Promise<ImpactAnalysisResult> {
    const artifacts = await this.loadGraphArtifacts(options.cwd);
    const nodeId = resolveNodeId(options.documentIdOrPath, artifacts);
    if (!nodeId) {
      throw new Error(`Document not found: ${options.documentIdOrPath}`);
    }
    const node = artifacts.nodeMap.get(nodeId);
    if (!node) {
      throw new Error(`Document not found: ${options.documentIdOrPath}`);
    }
    const findings = this.impactAnalyzer.analyze(nodeId, artifacts.adjacency, options.impact);
    return { node, findings };
  }

  private async loadGraphArtifacts(cwd: string): Promise<GraphBuildArtifacts> {
    const scan = await this.scanner.scan({ cwd });
    return this.builder.build(scan.documents, {
      generatedAt: this.clock().toISOString(),
      errors: scan.errors
    });
  }
}

export function createGraphService(deps?: GraphServiceDependencies): GraphService {
  return new GraphService(deps);
}

function resolveNodeId(target: string, artifacts: GraphBuildArtifacts): string | null {
  if (artifacts.nodeMap.has(target)) {
    return target;
  }

  const trimmed = target.trim();
  if (!trimmed) return null;

  const candidateId = path.basename(trimmed).replace(/\.md$/i, '').toUpperCase();
  if (artifacts.nodeMap.has(candidateId)) {
    return candidateId;
  }

  const normalized = normalizePath(trimmed);
  if (!normalized) {
    return null;
  }

  for (const [id, node] of artifacts.nodeMap.entries()) {
    const nodePath = normalizePath(node.path);
    if (nodePath.endsWith(normalized) || normalized.endsWith(nodePath)) {
      return id;
    }
  }

  return null;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\/+/, '').toLowerCase();
}
