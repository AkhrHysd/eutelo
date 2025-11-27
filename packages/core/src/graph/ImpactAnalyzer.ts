import type { GraphAdjacency, GraphRelationType, ImpactFinding, ImpactPriority } from './types.js';

export type ImpactAnalysisOptions = {
  maxDepth?: number;
  /** 探索方向の制限 */
  direction?: 'upstream' | 'downstream' | 'both';
  /** 含めるリレーション種別 */
  includeRelations?: GraphRelationType[];
};

export class ImpactAnalyzer {
  analyze(startId: string, adjacency: GraphAdjacency, options: ImpactAnalysisOptions = {}): ImpactFinding[] {
    const maxDepth = options.maxDepth ?? 3;
    const direction = options.direction ?? 'both';
    const includeRelations = options.includeRelations;
    const queue: Array<{ id: string; hop: number }> = [{ id: startId, hop: 0 }];
    const visited = new Set<string>([startId]);
    const findings: ImpactFinding[] = [];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      if (current.hop >= maxDepth) {
        continue;
      }

      // Collect edges based on direction
      const edges: Array<{ edge: typeof adjacency.incoming[string][number]; isIncoming: boolean }> = [];

      if (direction === 'both' || direction === 'upstream') {
        // Incoming edges = upstream (parent direction)
        const incoming = adjacency.incoming[current.id] ?? [];
        for (const edge of incoming) {
          if (!includeRelations || includeRelations.includes(edge.relation)) {
            edges.push({ edge, isIncoming: true });
          }
        }
      }

      if (direction === 'both' || direction === 'downstream') {
        // Outgoing edges = downstream (child direction)
        const outgoing = adjacency.outgoing[current.id] ?? [];
        for (const edge of outgoing) {
          if (!includeRelations || includeRelations.includes(edge.relation)) {
            edges.push({ edge, isIncoming: false });
          }
        }
      }

      for (const { edge, isIncoming } of edges) {
        const nextId = isIncoming ? edge.from : edge.to;
        if (!nextId || visited.has(nextId)) {
          continue;
        }
        const hop = current.hop + 1;
        visited.add(nextId);
        findings.push({
          id: nextId,
          hop,
          via: edge.relation,
          direction: isIncoming ? 'upstream' : 'downstream',
          priority: determinePriority(hop)
        });
        queue.push({ id: nextId, hop });
      }
    }

    return findings.sort((a, b) => {
      if (a.hop === b.hop) {
        return a.id.localeCompare(b.id);
      }
      return a.hop - b.hop;
    });
  }
}

function determinePriority(hop: number): ImpactPriority {
  if (hop <= 1) return 'must-review';
  if (hop === 2) return 'should-review';
  return 'informational';
}
