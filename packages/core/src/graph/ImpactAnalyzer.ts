import type { GraphAdjacency, ImpactFinding, ImpactPriority } from './types.js';

export type ImpactAnalysisOptions = {
  maxDepth?: number;
};

export class ImpactAnalyzer {
  analyze(startId: string, adjacency: GraphAdjacency, options: ImpactAnalysisOptions = {}): ImpactFinding[] {
    const maxDepth = options.maxDepth ?? 3;
    const queue: Array<{ id: string; hop: number }> = [{ id: startId, hop: 0 }];
    const visited = new Set<string>([startId]);
    const findings: ImpactFinding[] = [];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      if (current.hop >= maxDepth) {
        continue;
      }

      const neighbors = [
        ...(adjacency.outgoing[current.id] ?? []),
        ...(adjacency.incoming[current.id] ?? [])
      ];

      for (const edge of neighbors) {
        const nextId = edge.from === current.id ? edge.to : edge.from;
        if (!nextId || visited.has(nextId)) {
          continue;
        }
        const hop = current.hop + 1;
        visited.add(nextId);
        findings.push({
          id: nextId,
          hop,
          via: edge.relation,
          direction: edge.to === current.id ? 'upstream' : 'downstream',
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
