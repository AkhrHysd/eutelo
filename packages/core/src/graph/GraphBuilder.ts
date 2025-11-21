import type {
  DocumentGraph,
  DocumentScanError,
  GraphAdjacency,
  GraphEdge,
  GraphIntegrityReport,
  GraphNode,
  GraphStats,
  ScannedDocument
} from './types.js';

const GRAPH_VERSION = '0.1.0';

export type BuildGraphOptions = {
  generatedAt?: string;
  errors?: DocumentScanError[];
};

export type GraphBuildArtifacts = {
  graph: DocumentGraph;
  adjacency: GraphAdjacency;
  nodeMap: Map<string, GraphNode>;
};

export class GraphBuilder {
  build(documents: ScannedDocument[], options: BuildGraphOptions = {}): GraphBuildArtifacts {
    const timestamp = options.generatedAt ?? new Date().toISOString();
    const nodeMap = new Map<string, GraphNode>();

    for (const document of documents) {
      nodeMap.set(document.id, {
        id: document.id,
        type: document.type,
        feature: document.feature,
        title: document.title,
        status: document.status,
        parentIds: document.parentIds,
        relatedIds: document.relatedIds,
        mentionIds: document.mentionIds,
        tags: document.tags,
        owners: document.owners,
        lastUpdated: document.lastUpdated,
        path: document.path,
        warnings: document.warnings
      });
    }

    const adjacency: GraphAdjacency = { incoming: {}, outgoing: {} };
    const edges: GraphEdge[] = [];
    const danglingEdges: GraphEdge[] = [];
    const seenEdges = new Set<string>();
    const nodeIds = new Set(nodeMap.keys());

    const recordEdge = (edge: Omit<GraphEdge, 'id'>): void => {
      const key = `${edge.from}->${edge.to}:${edge.relation}:${edge.source}`;
      if (seenEdges.has(key)) return;
      seenEdges.add(key);
      const next: GraphEdge = { ...edge, id: key };
      const hasFrom = nodeIds.has(edge.from);
      const hasTo = nodeIds.has(edge.to);
      if (!hasFrom || !hasTo) {
        danglingEdges.push(next);
        return;
      }
      edges.push(next);
      (adjacency.outgoing[edge.from] ??= []).push(next);
      (adjacency.incoming[edge.to] ??= []).push(next);
    };

    for (const document of documents) {
      for (const parentId of document.parentIds) {
        recordEdge({
          from: parentId,
          to: document.id,
          relation: 'parent',
          source: 'frontmatter',
          weight: 1
        });
      }

      for (const relatedId of document.relatedIds) {
        recordEdge({
          from: document.id,
          to: relatedId,
          relation: 'related',
          source: 'frontmatter',
          weight: 1
        });
      }

      for (const mentionId of document.mentionIds) {
        if (mentionId === document.id) continue;
        recordEdge({
          from: document.id,
          to: mentionId,
          relation: 'mentions',
          source: 'content',
          weight: 0.5
        });
      }
    }

    const graph: DocumentGraph = {
      version: GRAPH_VERSION,
      generatedAt: timestamp,
      nodes: Array.from(nodeMap.values()),
      edges,
      stats: computeStats(nodeMap, edges.length),
      integrity: computeIntegrity(nodeMap, adjacency, danglingEdges),
      errors: options.errors ?? []
    };

    return { graph, adjacency, nodeMap };
  }
}

function computeStats(nodeMap: Map<string, GraphNode>, edgeCount: number): GraphStats {
  const byType: Record<string, number> = {};
  const byFeature: Record<string, number> = {};

  for (const node of nodeMap.values()) {
    const type = node.type ?? 'unknown';
    byType[type] = (byType[type] ?? 0) + 1;
    const feature = node.feature ?? 'unknown';
    byFeature[feature] = (byFeature[feature] ?? 0) + 1;
  }

  return {
    nodeCount: nodeMap.size,
    edgeCount,
    byType,
    byFeature
  };
}

function computeIntegrity(
  nodeMap: Map<string, GraphNode>,
  adjacency: GraphAdjacency,
  danglingEdges: GraphEdge[]
): GraphIntegrityReport {
  const orphanNodeIds: string[] = [];
  for (const node of nodeMap.values()) {
    const incoming = adjacency.incoming[node.id] ?? [];
    const outgoing = adjacency.outgoing[node.id] ?? [];
    if (incoming.length === 0 && outgoing.length === 0) {
      orphanNodeIds.push(node.id);
    }
  }

  return { orphanNodeIds, danglingEdges };
}
