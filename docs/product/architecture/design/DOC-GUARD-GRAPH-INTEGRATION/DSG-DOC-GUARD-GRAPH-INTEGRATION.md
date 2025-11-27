---
id: DSG-DOC-GUARD-GRAPH-INTEGRATION
type: design
feature: doc-guard-graph-integration
title: Guard × Graph 連携 設計仕様
purpose: >
  eutelo guard が eutelo graph の機能を活用して関連ドキュメントを
  自動探索・収集するための内部アーキテクチャとインターフェースを定義する。
status: draft
version: 0.1
parent: PRD-DOC-GUARD-GRAPH-INTEGRATION
owners: ["@AkhrHysd"]
tags: ["doc-guard", "doc-graph", "integration", "design"]
last_updated: "2025-11-27"
---

# DSG-DOC-GUARD-GRAPH-INTEGRATION

Guard × Graph 連携 設計仕様

---

## 1. 概要

本設計は、eutelo guard が eutelo graph の探索機能を活用し、
指定されたドキュメントの関連ドキュメントを自動収集する仕組みを定義する。

### 設計原則

1. **責務分離**: ドキュメント関係の探索は graph 層に委譲し、guard は収集結果を利用する
2. **オプトアウト可能**: デフォルトで関連収集を有効にしつつ、無効化オプションを提供
3. **段階的探索**: depth オプションで探索範囲を制御し、パフォーマンスとのバランスを取る
4. **フォールバック**: graph 構築失敗時は指定ドキュメントのみでチェックを続行

---

## 2. アーキテクチャ構成

### 2.1 コンポーネント配置

```
packages/
  cli/
    src/index.ts           # guard コマンドの引数拡張
  core/
    src/
      graph/
        RelatedDocumentResolver.ts  # [NEW] 関連ドキュメント解決
        types.ts                    # ResolveRelatedOptions 型追加
      guard/
        DocumentLoader.ts           # RelatedDocumentResolver 統合
      services/
        GuardService.ts             # 関連ドキュメント収集オプション追加
```

### 2.2 依存関係

```
CLI (guard command)
    │
    ├── GuardService
    │       │
    │       ├── RelatedDocumentResolver ← [NEW]
    │       │       │
    │       │       ├── DocumentScanner (既存)
    │       │       ├── GraphBuilder (既存)
    │       │       └── ImpactAnalyzer (既存 - 拡張)
    │       │
    │       └── DocumentLoader (既存)
    │               └── RelatedDocumentResolver 利用
    │
    └── LLMClient (既存)
```

---

## 3. 新規コンポーネント設計

### 3.1 RelatedDocumentResolver

関連ドキュメントの探索・解決を担当する新規コンポーネント。

```typescript
// packages/core/src/graph/RelatedDocumentResolver.ts

export type ResolveRelatedOptions = {
  /** 探索深さ（デフォルト: 1） */
  depth?: number;
  /** 深さ無制限で全関連を取得 */
  all?: boolean;
  /** 探索方向 */
  direction?: 'upstream' | 'downstream' | 'both';
  /** 含めるリレーション種別 */
  relations?: Array<'parent' | 'related' | 'mentions'>;
};

export type ResolvedRelatedDocument = {
  /** ドキュメント ID */
  id: string;
  /** ファイルパス */
  path: string;
  /** 探索元からの距離（hop 数） */
  hop: number;
  /** このドキュメントに到達したリレーション種別 */
  via: 'parent' | 'related' | 'mentions';
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

export class RelatedDocumentResolver {
  constructor(
    private readonly scanner: DocumentScanner,
    private readonly builder: GraphBuilder,
    private readonly analyzer: ImpactAnalyzer
  ) {}

  async resolve(
    documentPath: string,
    options: ResolveRelatedOptions = {}
  ): Promise<ResolveRelatedResult>;
}
```

### 3.2 探索アルゴリズム

```
1. 起点ドキュメントの frontmatter を解析し id を取得
2. DocumentScanner で全ドキュメントをスキャン（キャッシュ利用可能）
3. GraphBuilder でグラフ構造を構築
4. ImpactAnalyzer を使用して BFS で関連ドキュメントを探索
   - depth=N: N ホップまで探索
   - all=true: 全ノード到達まで探索（ただし上限 100 ノード）
5. 探索結果を ResolveRelatedResult として返却
```

### 3.3 探索方向の定義

| direction | 説明 | 取得対象 |
|-----------|------|----------|
| upstream | 上位方向のみ | parent 先祖、参照元 |
| downstream | 下位方向のみ | 子ドキュメント、派生ドキュメント |
| both | 双方向（デフォルト） | 全関連ドキュメント |

---

## 4. 既存コンポーネントの拡張

### 4.1 ImpactAnalyzer 拡張

`ImpactAnalyzer` に方向指定オプションを追加。

```typescript
// packages/core/src/graph/ImpactAnalyzer.ts

export type ImpactAnalysisOptions = {
  maxDepth?: number;
  /** 探索方向の制限 */
  direction?: 'upstream' | 'downstream' | 'both';
  /** 含めるリレーション種別 */
  includeRelations?: Array<'parent' | 'related' | 'mentions'>;
};
```

### 4.2 GuardService 拡張

`GuardService` に関連ドキュメント収集オプションを追加。

```typescript
// packages/core/src/services/GuardService.ts

export type RunGuardOptions = {
  documents: string[];
  checkId?: string;
  format?: GuardOutputFormat;
  failOnError?: boolean;
  warnOnly?: boolean;
  /** [NEW] 関連ドキュメント収集オプション */
  relatedOptions?: {
    /** 関連収集を有効化（デフォルト: true） */
    enabled?: boolean;
    /** 探索深さ */
    depth?: number;
    /** 全関連を取得 */
    all?: boolean;
  };
};
```

### 4.3 DocumentLoader 拡張

`DocumentLoader` が `RelatedDocumentResolver` を利用して関連ドキュメントを自動収集。

```typescript
// packages/core/src/guard/DocumentLoader.ts

export type DocumentLoadOptions = {
  /** 関連ドキュメントを自動収集 */
  resolveRelated?: boolean;
  /** 探索深さ */
  depth?: number;
  /** 全関連を取得 */
  all?: boolean;
};

export class DocumentLoader {
  constructor(
    private readonly fileSystemAdapter: FileSystemAdapter,
    private readonly relatedResolver?: RelatedDocumentResolver
  ) {}

  async loadDocuments(
    documentPaths: string[],
    options?: DocumentLoadOptions
  ): Promise<DocumentLoadResult>;
}
```

---

## 5. CLI インターフェース

### 5.1 guard コマンド拡張

```bash
eutelo guard [documents...] [options]

Options:
  --with-related          関連ドキュメントを自動収集（デフォルト: 有効）
  --no-related            関連ドキュメント収集を無効化
  --depth <number>        探索深さを指定（デフォルト: 1）
  --all                   深さ無制限で全関連を取得
  --format <format>       出力形式 (text | json)
  --fail-on-error         エラー時に exit code 2 で終了
  --warn-only             警告のみで exit code 0 を維持
```

### 5.2 graph related コマンド（新規）

```bash
eutelo graph related <document> [options]

Arguments:
  document                対象ドキュメントのパス

Options:
  --depth <number>        探索深さを指定（デフォルト: 1）
  --all                   深さ無制限で全関連を取得
  --direction <dir>       探索方向 (upstream | downstream | both)
  --format <format>       出力形式 (text | json)
```

---

## 6. データフロー

### 6.1 guard 実行フロー（関連収集有効時）

```
ユーザー入力: eutelo guard docs/PRD-AUTH.md --depth=2

1. CLI が引数をパース
   - documents: ["docs/PRD-AUTH.md"]
   - relatedOptions: { enabled: true, depth: 2 }

2. GuardService.run() 呼び出し

3. DocumentLoader.loadDocuments() 内で:
   3.1 RelatedDocumentResolver.resolve("docs/PRD-AUTH.md", { depth: 2 }) 呼び出し
   3.2 DocumentScanner が全ドキュメントをスキャン
   3.3 GraphBuilder がグラフ構築
   3.4 ImpactAnalyzer が PRD-AUTH から 2-hop 以内のノードを探索
   3.5 結果:
       - PRD-AUTH (起点)
       - PRD-CORE (parent, hop=1, upstream)
       - BEH-AUTH (related, hop=1, downstream)
       - DSG-AUTH (related, hop=1, downstream)
       - BEH-AUTH-LOGIN (子, hop=2, downstream)

4. 収集された全ドキュメントをロード
   - [PRD-AUTH, PRD-CORE, BEH-AUTH, DSG-AUTH, BEH-AUTH-LOGIN]

5. PromptBuilder.buildPrompt() で全ドキュメントを含むプロンプト生成

6. LLMClient.generate() で整合性チェック

7. 結果を返却
```

### 6.2 出力例

```
$ eutelo guard docs/PRD-AUTH.md --depth=2

Resolving related documents (depth=2)...
  Origin: PRD-AUTH (docs/product/features/AUTH/PRD-AUTH.md)
  Found 4 related document(s):
    ↑ PRD-CORE (parent, hop=1)
    ↓ BEH-AUTH (related, hop=1)
    ↓ DSG-AUTH (related, hop=1)
    ↓ BEH-AUTH-LOGIN (related, hop=2)

Analyzing 5 document(s)...

[DEBUG] Environment variables check:
[DEBUG] EUTELO_GUARD_API_ENDPOINT: SET
[DEBUG] EUTELO_GUARD_API_KEY: SET (sk-proj-...)
[DEBUG] EUTELO_GUARD_MODEL: gpt-4.1-2025-04-14

Issues found:
  - ISSUE-001: PRD-AUTH の scope に記載された OAuth 機能が BEH-AUTH で未定義
  - ISSUE-002: DSG-AUTH の認証フローが PRD-AUTH の要件と不整合

Analyzed 5 document(s). Found 2 issue(s).
```

---

## 7. エラーハンドリング

### 7.1 グラフ構築失敗時

```typescript
try {
  const related = await this.relatedResolver.resolve(documentPath, options);
  allDocuments.push(...related.related.map(r => r.path));
} catch (error) {
  // グラフ構築失敗時は警告を出力して続行
  warnings.push(`Failed to resolve related documents: ${error.message}`);
  // 指定されたドキュメントのみでチェック続行
}
```

### 7.2 循環参照検出

```typescript
const visited = new Set<string>();
const queue = [{ id: startId, hop: 0 }];

while (queue.length > 0) {
  const current = queue.shift()!;
  if (visited.has(current.id)) {
    // 循環を検出 - スキップして警告
    warnings.push(`Circular reference detected at ${current.id}`);
    continue;
  }
  visited.add(current.id);
  // ...
}
```

### 7.3 探索上限

```typescript
const MAX_RELATED_DOCUMENTS = 100;

if (findings.length >= MAX_RELATED_DOCUMENTS) {
  warnings.push(`Related document limit reached (${MAX_RELATED_DOCUMENTS}). Some documents may be omitted.`);
  break;
}
```

---

## 8. パフォーマンス考慮

### 8.1 キャッシュ戦略

```typescript
// グラフ構築結果のインメモリキャッシュ
private graphCache: {
  graph: DocumentGraph;
  adjacency: GraphAdjacency;
  nodeMap: Map<string, GraphNode>;
  timestamp: number;
} | null = null;

private readonly CACHE_TTL = 60000; // 1分

private async getOrBuildGraph(): Promise<GraphBuildArtifacts> {
  const now = Date.now();
  if (this.graphCache && now - this.graphCache.timestamp < this.CACHE_TTL) {
    return this.graphCache;
  }
  // グラフ再構築
  const result = await this.buildGraph();
  this.graphCache = { ...result, timestamp: now };
  return result;
}
```

### 8.2 遅延スキャン

```typescript
// 必要なディレクトリのみスキャン
async resolve(documentPath: string, options: ResolveRelatedOptions): Promise<ResolveRelatedResult> {
  // まず対象ドキュメントの feature を特定
  const targetDoc = await this.scanner.scanSingle(documentPath);
  const feature = targetDoc.feature;

  // 同一 feature のドキュメントのみスキャン（depth=1 の場合）
  if (options.depth === 1 && feature) {
    const featureDocuments = await this.scanner.scanFeature(feature);
    // ...
  }
  // ...
}
```

---

## 9. テスト方針

### 9.1 ユニットテスト

```typescript
// RelatedDocumentResolver.test.ts
describe('RelatedDocumentResolver', () => {
  it('should resolve parent documents', async () => {
    // PRD-AUTH の parent (PRD-CORE) を取得
  });

  it('should resolve related documents', async () => {
    // PRD-AUTH の related (BEH-AUTH, DSG-AUTH) を取得
  });

  it('should respect depth limit', async () => {
    // depth=1 で 1-hop のみ取得
  });

  it('should handle circular references', async () => {
    // 循環参照で無限ループしないことを確認
  });
});
```

### 9.2 統合テスト

```typescript
// guard-related.e2e.test.ts
describe('eutelo guard with --with-related', () => {
  it('should collect related documents automatically', async () => {
    // 単一ドキュメント指定で関連が収集されることを確認
  });

  it('should skip related collection with --no-related', async () => {
    // --no-related で収集がスキップされることを確認
  });
});
```

---

## 10. 完了条件（Definition of Done）

- [ ] RelatedDocumentResolver が実装され、単体テストをパスする
- [ ] ImpactAnalyzer に direction オプションが追加される
- [ ] GuardService が relatedOptions を受け取り適切に処理する
- [ ] CLI に --with-related / --no-related / --depth / --all オプションが追加される
- [ ] `eutelo graph related` コマンドが実装される
- [ ] 統合テストで単一ドキュメント指定時の関連収集が動作確認される
- [ ] パフォーマンス要件（500ms 以内）を満たす
- [ ] PRD / BEH と整合が取れている

---

## 11. 今後の拡張

- **キャッシュの永続化**: CI 実行間でグラフキャッシュを共有
- **重要度フィルタリング**: LLM への入力を最適化するため、重要度でフィルタリング
- **差分グラフ**: 前回実行からの変更部分のみ再解析

---

