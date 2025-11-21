import type { DocumentGraph } from './types.js';

export type GraphSerializationFormat = 'json' | 'mermaid';

export type GraphSerializerOptions = {
  maxEdges?: number;
};

export class GraphSerializer {
  static serialize(graph: DocumentGraph, format: GraphSerializationFormat, options: GraphSerializerOptions = {}): string {
    if (format === 'mermaid') {
      return this.toMermaid(graph, options);
    }
    return this.toJSON(graph);
  }

  static toJSON(graph: DocumentGraph): string {
    return JSON.stringify(graph, null, 2);
  }

  static toMermaid(graph: DocumentGraph, options: GraphSerializerOptions = {}): string {
    const maxEdges = options.maxEdges ?? 200;
    const lines: string[] = ['flowchart TD'];
    const idMap = new Map<string, string>();

    for (const node of graph.nodes) {
      const sanitized = sanitizeId(node.id);
      idMap.set(node.id, sanitized);
      const title = node.title ? `${node.id}\\n${node.title}` : `${node.id}\\n(${node.type})`;
      lines.push(`  ${sanitized}["${title}"]`);
    }

    graph.edges.slice(0, maxEdges).forEach((edge) => {
      const from = idMap.get(edge.from);
      const to = idMap.get(edge.to);
      if (!from || !to) {
        return;
      }
      const label = edge.relation === 'parent' ? 'parent' : edge.relation;
      lines.push(`  ${from} -->|${label}| ${to}`);
    });

    if (graph.edges.length > maxEdges) {
      lines.push(`  note("... truncated ${graph.edges.length - maxEdges} edges ...")`);
    }

    return `${lines.join('\n')}\n`;
  }
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, '_');
}
