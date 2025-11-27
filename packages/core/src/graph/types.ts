export type DocumentKind = string;

export type GraphRelationType = 'parent' | 'related' | 'mentions';

export type GraphEdgeSource = 'frontmatter' | 'content';

export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  relation: GraphRelationType;
  source: GraphEdgeSource;
  weight: number;
};

export type GraphNode = {
  id: string;
  type: DocumentKind;
  path: string;
  feature?: string;
  title?: string;
  status?: string;
  parentIds: string[];
  relatedIds: string[];
  mentionIds: string[];
  tags: string[];
  owners: string[];
  lastUpdated?: string;
  warnings: string[];
};

export type DocumentScanError = {
  path: string;
  message: string;
};

export type ScannedDocument = GraphNode & {
  absolutePath: string;
};

export type DocumentScanResult = {
  documents: ScannedDocument[];
  errors: DocumentScanError[];
};

export type GraphStats = {
  nodeCount: number;
  edgeCount: number;
  byType: Record<string, number>;
  byFeature: Record<string, number>;
};

export type GraphIntegrityReport = {
  orphanNodeIds: string[];
  danglingEdges: GraphEdge[];
};

export type DocumentGraph = {
  version: string;
  generatedAt: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: GraphStats;
  integrity: GraphIntegrityReport;
  errors: DocumentScanError[];
};

export type GraphAdjacency = {
  incoming: Record<string, GraphEdge[]>;
  outgoing: Record<string, GraphEdge[]>;
};

export type ImpactPriority = 'must-review' | 'should-review' | 'informational';

export type ImpactFinding = {
  id: string;
  hop: number;
  via: GraphRelationType;
  direction: 'upstream' | 'downstream';
  priority: ImpactPriority;
};

// RelatedDocumentResolver types
export type ResolveRelatedOptions = {
  /** 探索深さ（デフォルト: 1） */
  depth?: number;
  /** 深さ無制限で全関連を取得 */
  all?: boolean;
  /** 探索方向 */
  direction?: 'upstream' | 'downstream' | 'both';
  /** 含めるリレーション種別 */
  relations?: GraphRelationType[];
};

export type ResolvedRelatedDocument = {
  /** ドキュメント ID */
  id: string;
  /** ファイルパス */
  path: string;
  /** 探索元からの距離（hop 数） */
  hop: number;
  /** このドキュメントに到達したリレーション種別 */
  via: GraphRelationType;
  /** 探索方向（上位/下位） */
  direction: 'upstream' | 'downstream';
};

export type ResolveRelatedResult = {
  /** 起点ドキュメント */
  origin: { id: string; path: string };
  /** 収集された関連ドキュメント */
  related: ResolvedRelatedDocument[];
  /** 探索統計 */
  stats: {
    totalFound: number;
    maxHop: number;
    byRelation: Record<string, number>;
  };
  /** 探索中の警告 */
  warnings: string[];
};
