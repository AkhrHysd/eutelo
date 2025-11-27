import type { DocumentScanner } from './DocumentScanner.js';
import type { GraphBuilder, GraphBuildArtifacts } from './GraphBuilder.js';
import { ImpactAnalyzer } from './ImpactAnalyzer.js';
import type {
  GraphAdjacency,
  GraphNode,
  GraphRelationType,
  ResolvedRelatedDocument,
  ResolveRelatedOptions,
  ResolveRelatedResult
} from './types.js';

const MAX_RELATED_DOCUMENTS = 100;

/**
 * 重要度フィルタリングの設定（将来拡張用スケルトン）
 * 
 * ## 意図
 * - LLM への入力サイズを最適化するため、重要度の低いドキュメントを除外
 * - 現在は未実装だが、将来の拡張ポイントとして定義
 * 
 * ## 将来の実装予定
 * - ドキュメントタイプによる優先度付け（PRD > BEH > DSG など）
 * - hop 数による重み付け
 * - カスタム優先度関数のサポート
 */
export type PriorityFilterConfig = {
  /** 有効化フラグ */
  enabled: boolean;
  /** 最大収集数（優先度順に上位N件） */
  maxCount?: number;
  /** タイプ別の優先度（高い値が優先） */
  typePriority?: Record<string, number>;
};

export type RelatedDocumentResolverOptions = ResolveRelatedOptions & {
  /** Current working directory for scanning */
  cwd?: string;
  /** 
   * Priority filter configuration (placeholder for future implementation)
   * @remarks Currently ignored with a warning. Reserved for future LLM input optimization.
   */
  priorityFilter?: PriorityFilterConfig;
};

export class RelatedDocumentResolver {
  private readonly scanner: DocumentScanner;
  private readonly builder: GraphBuilder;
  private readonly analyzer: ImpactAnalyzer;
  private readonly defaultCwd: string;

  constructor(dependencies: {
    scanner: DocumentScanner;
    builder: GraphBuilder;
    analyzer?: ImpactAnalyzer;
    cwd?: string;
  }) {
    this.scanner = dependencies.scanner;
    this.builder = dependencies.builder;
    this.analyzer = dependencies.analyzer ?? new ImpactAnalyzer();
    this.defaultCwd = dependencies.cwd ?? process.cwd();
  }

  async resolve(
    documentPath: string,
    options: RelatedDocumentResolverOptions = {}
  ): Promise<ResolveRelatedResult> {
    const {
      depth = 1,
      all = false,
      direction = 'both',
      relations = ['parent', 'related', 'mentions'],
      cwd = this.defaultCwd,
      priorityFilter
    } = options;

    const warnings: string[] = [];
    
    // Priority filter is a placeholder for future implementation
    if (priorityFilter?.enabled) {
      warnings.push('priorityFilter is not yet implemented and will be ignored. Reserved for future LLM input optimization.');
    }

    // Scan all documents and build graph
    const scanResult = await this.scanner.scan({ cwd });
    if (scanResult.errors.length > 0) {
      for (const error of scanResult.errors) {
        warnings.push(`Scan error: ${error.path} - ${error.message}`);
      }
    }

    const { graph, adjacency, nodeMap } = this.builder.build(scanResult.documents, {
      errors: scanResult.errors
    });

    // Add warnings for dangling edges (references to non-existent documents)
    for (const danglingEdge of graph.integrity.danglingEdges) {
      const hasFrom = nodeMap.has(danglingEdge.from);
      const hasTo = nodeMap.has(danglingEdge.to);
      const missingId = !hasFrom ? danglingEdge.from : danglingEdge.to;
      
      if (danglingEdge.relation === 'parent') {
        // For parent edges, from is the parent ID
        warnings.push(`Parent document not found: ${missingId}`);
      } else {
        warnings.push(`Related document not found: ${missingId}`);
      }
    }

    // Find the origin document by path or ID
    const originNode = this.findNodeByPathOrId(nodeMap, documentPath);
    if (!originNode) {
      throw new Error(`Document not found: ${documentPath}`);
    }

    // Resolve related documents using BFS
    const maxDepth = all ? Infinity : depth;
    const related = this.traverseRelated(
      originNode.id,
      adjacency,
      nodeMap,
      maxDepth,
      direction,
      relations,
      warnings
    );

    // Compute stats
    const byRelation: Record<string, number> = {};
    let maxHop = 0;
    for (const doc of related) {
      byRelation[doc.via] = (byRelation[doc.via] ?? 0) + 1;
      if (doc.hop > maxHop) {
        maxHop = doc.hop;
      }
    }

    return {
      origin: { id: originNode.id, path: originNode.path },
      related,
      stats: {
        totalFound: related.length,
        maxHop,
        byRelation
      },
      warnings
    };
  }

  private findNodeByPathOrId(nodeMap: Map<string, GraphNode>, pathOrId: string): GraphNode | undefined {
    // Try direct ID match first
    if (nodeMap.has(pathOrId)) {
      return nodeMap.get(pathOrId);
    }
    
    // Try exact path match
    for (const node of nodeMap.values()) {
      if (node.path === pathOrId) {
        return node;
      }
    }
    
    // Try matching by normalized path (remove leading ./ or docs/)
    const normalizedPath = pathOrId.replace(/^\.\//, '').replace(/^docs\//, '');
    for (const node of nodeMap.values()) {
      const normalizedNodePath = node.path.replace(/^\.\//, '').replace(/^docs\//, '');
      if (normalizedNodePath === normalizedPath || node.path.endsWith(normalizedPath)) {
        return node;
      }
    }
    
    return undefined;
  }

  private traverseRelated(
    startId: string,
    adjacency: GraphAdjacency,
    nodeMap: Map<string, GraphNode>,
    maxDepth: number,
    direction: 'upstream' | 'downstream' | 'both',
    relations: GraphRelationType[],
    warnings: string[]
  ): ResolvedRelatedDocument[] {
    const visited = new Set<string>([startId]);
    const queue: Array<{ id: string; hop: number }> = [{ id: startId, hop: 0 }];
    const results: ResolvedRelatedDocument[] = [];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;

      if (current.hop >= maxDepth) {
        continue;
      }

      // Get edges based on direction
      const edges: Array<{ edge: typeof adjacency.incoming[string][number]; isIncoming: boolean }> = [];

      if (direction === 'both' || direction === 'upstream') {
        // Incoming edges = upstream (parent direction)
        const incoming = adjacency.incoming[current.id] ?? [];
        for (const edge of incoming) {
          if (relations.includes(edge.relation)) {
            edges.push({ edge, isIncoming: true });
          }
        }
      }

      if (direction === 'both' || direction === 'downstream') {
        // Outgoing edges = downstream (child direction)
        const outgoing = adjacency.outgoing[current.id] ?? [];
        for (const edge of outgoing) {
          if (relations.includes(edge.relation)) {
            edges.push({ edge, isIncoming: false });
          }
        }
      }

      for (const { edge, isIncoming } of edges) {
        const nextId = isIncoming ? edge.from : edge.to;

        if (visited.has(nextId)) {
          // Circular reference detected
          if (current.hop > 0) {
            // Only warn if we're not at the start
            const alreadyWarned = warnings.some(w => w.includes(`Circular reference`) && w.includes(nextId));
            if (!alreadyWarned) {
              warnings.push(`Circular reference detected at ${nextId}`);
            }
          }
          continue;
        }

        visited.add(nextId);
        const hop = current.hop + 1;
        const node = nodeMap.get(nextId);

        if (!node) {
          warnings.push(`Parent document not found: ${nextId}`);
          continue;
        }

        results.push({
          id: nextId,
          path: node.path,
          hop,
          via: edge.relation,
          direction: isIncoming ? 'upstream' : 'downstream'
        });

        if (results.length >= MAX_RELATED_DOCUMENTS) {
          warnings.push(`Related document limit reached (${MAX_RELATED_DOCUMENTS}). Some documents may be omitted.`);
          return results;
        }

        queue.push({ id: nextId, hop });
      }
    }

    return results.sort((a, b) => {
      if (a.hop !== b.hop) return a.hop - b.hop;
      return a.id.localeCompare(b.id);
    });
  }
}

