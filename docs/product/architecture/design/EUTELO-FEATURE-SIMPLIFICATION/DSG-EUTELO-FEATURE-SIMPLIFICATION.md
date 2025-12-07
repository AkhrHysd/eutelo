---
id: DSG-EUTELO-FEATURE-SIMPLIFICATION
type: design
feature: EUTELO-FEATURE-SIMPLIFICATION
title: Eutelo 機能簡素化 設計仕様
purpose: >
  Euteloの本来のコンセプトに合致しない機能・オプションを排除するための
  実装設計を定義する。コアバリューに集中したシンプルなエコシステムを実現する。
status: draft
version: 0.1
parent: PRD-EUTELO-FEATURE-SIMPLIFICATION
owners: ["@AkhrHysd"]
tags: ["simplification", "core-values", "refactoring", "design"]
last_updated: "2025-01-27"
---

# DSG-EUTELO-FEATURE-SIMPLIFICATION

Eutelo 機能簡素化 設計仕様

---

## 1. 概要

本設計は、PRDで定義された機能簡素化を実現するための実装設計を定義する。
Euteloの本来のコンセプト（整合性チェックエコシステム）に集中するため、
不要なコマンド・オプションを削除し、内部実装として必要な機能は保持する。

### 設計原則

1. **コアバリューへの集中**: ドキュメント作成・整合性チェックに特化
2. **内部実装の保持**: `eutelo guard`が使用するグラフ機能は内部実装として保持
3. **後方互換性の考慮**: 組み込み種別は非推奨とするが、動作は維持
4. **段階的な移行**: 破壊的変更を許容しつつ、移行ガイドを提供

---

## 2. アーキテクチャ構成

### 2.1 削除対象コンポーネント

```
packages/
  cli/
    src/index.ts
      - graph コマンド全体（build, show, impact, summary, related）
      - config inspect コマンド
      - init --placeholder-format オプション
      - guard --japanese / --ja オプション
      - add の組み込み種別（非推奨警告を追加）
```

### 2.2 保持する内部実装

```
packages/
  core/
    src/
      graph/
        RelatedDocumentResolver.ts    # [KEEP] guard が使用
        GraphBuilder.ts                # [KEEP] 内部実装として必要
        DocumentScanner.ts             # [KEEP] 内部実装として必要
        ImpactAnalyzer.ts             # [KEEP] 内部実装として必要
        types.ts                      # [KEEP] 型定義
      services/
        GraphService.ts               # [KEEP] 内部実装として必要（guard が使用）
```

### 2.3 依存関係の変更

**変更前:**
```
CLI
  ├── graph コマンド（公開）
  │   └── GraphService
  ├── config inspect コマンド（公開）
  ├── guard コマンド
  │   └── GuardService
  │       └── RelatedDocumentResolver
  │           └── GraphService（内部利用）
  └── add コマンド（組み込み種別）
```

**変更後:**
```
CLI
  ├── guard コマンド
  │   └── GuardService
  │       └── RelatedDocumentResolver
  │           └── GraphService（内部利用のみ）
  └── add コマンド（組み込み種別は非推奨、カスタム種別を推奨）
```

---

## 3. 削除対象の詳細設計

### 3.1 `eutelo graph` コマンドの削除

#### 3.1.1 削除対象コード

**ファイル**: `packages/cli/src/index.ts`

**削除対象:**
- `graph` コマンド定義（行1090-1212）
  - `graph build` コマンド
  - `graph show <documentId>` コマンド
  - `graph impact <documentId>` コマンド
  - `graph summary` コマンド
  - `graph related <documentPath>` コマンド
- `runGraphBuildCommand` 関数（行390-418）
- `runGraphShowCommand` 関数（行420-439）
- `runGraphImpactCommand` 関数（行441-465）
- `runGraphSummaryCommand` 関数（行467-502）
- `runGraphRelatedCommand` 関数（行504-586）
- `GraphBuildCliOptions` 型（行72-75）
- `GraphImpactCliOptions` 型（行77-79）
- `GraphRelatedCommandOptions` 型（行504-513）
- `GraphOutputFormat` 型（行388）
- `normalizeGraphFormat` 関数（行588-597）

#### 3.1.2 保持する内部実装

以下のコンポーネントは`eutelo guard`が使用するため、削除しない：

- `packages/core/src/graph/RelatedDocumentResolver.ts`
- `packages/core/src/graph/GraphBuilder.ts`
- `packages/core/src/graph/DocumentScanner.ts`
- `packages/core/src/graph/ImpactAnalyzer.ts`
- `packages/core/src/services/GraphService.ts`

#### 3.1.3 実装手順

1. `packages/cli/src/index.ts`から`graph`コマンド定義を削除
2. 関連するヘルパー関数を削除
3. 型定義を削除
4. `GraphService`のインポートは保持（`GuardService`が使用）

### 3.2 `eutelo config inspect` コマンドの削除

#### 3.2.1 削除対象コード

**ファイル**: `packages/cli/src/index.ts`

**削除対象:**
- `configCommand.inspect` コマンド定義（行1214-1225）
- `runConfigInspect` 関数（行303-320）
- `ConfigInspectOptions` 型（行81-84）
- `normalizeConfigInspectFormat` 関数（行322-331）
- `renderConfigInspection` 関数（行333-386）

#### 3.2.2 実装手順

1. `packages/cli/src/index.ts`から`config inspect`コマンド定義を削除
2. 関連するヘルパー関数を削除
3. 型定義を削除

### 3.3 `eutelo init --placeholder-format` オプションの削除

#### 3.3.1 削除対象コード

**ファイル**: `packages/cli/src/index.ts`

**削除対象:**
- `InitCliOptions`型の`placeholderFormat`フィールド（行45）
- `--placeholder-format`オプション定義（行684）
- プレースホルダー形式の処理ロジック（行702-707）

#### 3.3.2 実装手順

1. `InitCliOptions`型から`placeholderFormat`を削除
2. `--placeholder-format`オプション定義を削除
3. プレースホルダー形式の処理ロジックを削除（固定形式`__VARIABLE__`を使用）

### 3.4 `eutelo guard --japanese` / `--ja` オプションの削除

#### 3.4.1 削除対象コード

**ファイル**: `packages/cli/src/index.ts`

**削除対象:**
- `GuardCliOptions`型の`japanese`フィールド（行62）
- `--japanese, --ja`オプション定義（行1043）
- `japanese`オプションの処理ロジック（行209）

#### 3.4.2 実装手順

1. `GuardCliOptions`型から`japanese`を削除
2. `--japanese, --ja`オプション定義を削除
3. `runGuardCommand`関数から`japanese`の処理を削除

### 3.5 `eutelo add` の組み込みドキュメント種別の非推奨化

#### 3.5.1 変更対象コード

**ファイル**: `packages/cli/src/index.ts`

**変更対象:**
- 組み込み種別のコマンド定義（行855-1029）
  - `add prd <feature>`
  - `add beh <feature>`
  - `add sub-prd <feature> <sub>`
  - `add sub-beh <feature> <sub>`
  - `add dsg <feature>`
  - `add adr <feature>`
  - `add task <name>`
  - `add ops <name>`

#### 3.5.2 実装手順

1. 各組み込み種別のコマンド定義に非推奨警告を追加
2. 警告メッセージを表示する処理を追加
3. カスタム種別の使用を推奨するメッセージを表示

**警告メッセージ例:**
```typescript
process.stderr.write(
  `Warning: 'eutelo add ${type}' is deprecated. ` +
  `Please define custom document types in eutelo.config.* and use 'eutelo add <kind>' instead.\n`
);
```

---

## 4. 内部実装の保持設計

### 4.1 `GraphService` の内部利用

`eutelo guard`は`RelatedDocumentResolver`を通じて`GraphService`を使用する。
このため、`GraphService`は内部実装として保持する必要がある。

**使用箇所:**
- `packages/core/src/services/GuardService.ts`
  - `RelatedDocumentResolver`を初期化（行152-170）
  - 関連ドキュメントの解決に使用

### 4.2 `RelatedDocumentResolver` の保持

`RelatedDocumentResolver`は`eutelo guard`の関連ドキュメント収集機能で使用される。
このため、削除せずに保持する。

**使用箇所:**
- `packages/core/src/guard/DocumentLoader.ts`
  - 関連ドキュメントの解決に使用
- `packages/core/src/services/GuardService.ts`
  - 関連ドキュメント収集オプションの処理

---

## 5. データフロー

### 5.1 削除前のフロー

```
ユーザー
  ├── eutelo graph build → GraphService → グラフ出力
  ├── eutelo graph show → GraphService → 関係表示
  ├── eutelo graph impact → GraphService → 影響範囲分析
  ├── eutelo graph summary → GraphService → 統計情報
  ├── eutelo graph related → RelatedDocumentResolver → 関連ドキュメント一覧
  ├── eutelo config inspect → loadConfig → 設定表示
  ├── eutelo guard → GuardService → RelatedDocumentResolver → GraphService
  └── eutelo add prd → AddDocumentService
```

### 5.2 削除後のフロー

```
ユーザー
  ├── eutelo guard → GuardService → RelatedDocumentResolver → GraphService（内部利用のみ）
  ├── eutelo add <kind> → AddDocumentService（カスタム種別推奨）
  └── eutelo add prd → AddDocumentService（非推奨警告表示）
```

---

## 6. 型定義の変更

### 6.1 削除する型

```typescript
// 削除
type GraphBuildCliOptions = {
  format?: string;
  output?: string;
};

type GraphImpactCliOptions = {
  depth?: string;
};

type GraphRelatedCommandOptions = {
  fileSystemAdapter: FileSystemAdapter;
  docsRoot: string;
  frontmatterSchemas?: FrontmatterSchemaConfig[];
  scaffold?: Record<string, ScaffoldTemplateConfig>;
  depth?: string;
  all?: boolean;
  direction?: string;
  format?: string;
};

type GraphOutputFormat = 'json' | 'mermaid';

type ConfigInspectOptions = {
  config?: string;
  format?: string;
};
```

### 6.2 変更する型

```typescript
// 変更前
type InitCliOptions = {
  dryRun?: boolean;
  createPlaceholders?: boolean;
  skipDynamicPaths?: boolean;
  placeholderFormat?: string;  // 削除
};

// 変更後
type InitCliOptions = {
  dryRun?: boolean;
  createPlaceholders?: boolean;
  skipDynamicPaths?: boolean;
};
```

```typescript
// 変更前
type GuardCliOptions = {
  format?: string;
  failOnError?: boolean;
  warnOnly?: boolean;
  check?: string;
  related?: boolean;
  depth?: string;
  all?: boolean;
  japanese?: boolean;  // 削除
};

// 変更後
type GuardCliOptions = {
  format?: string;
  failOnError?: boolean;
  warnOnly?: boolean;
  check?: string;
  related?: boolean;
  depth?: string;
  all?: boolean;
};
```

---

## 7. エラーハンドリング

### 7.1 削除されたコマンドのエラー

削除されたコマンド（`eutelo graph`, `eutelo config inspect`）が実行された場合、
commander.jsのデフォルトエラーハンドリングにより「unknown command」エラーが表示される。

### 7.2 非推奨警告の表示

組み込み種別を使用した場合、警告メッセージを表示するが、処理は継続する。

---

## 8. テスト戦略

### 8.1 削除対象のテスト

以下のテストファイルを削除または更新：

- `packages/cli/tests/graph.e2e.test.js` - 削除
- `packages/cli/tests/config.e2e.test.js` - `inspect`関連のテストを削除

### 8.2 保持機能のテスト

以下のテストは保持：

- `packages/core/tests/graph/*.test.ts` - 内部実装のテストとして保持
- `packages/core/tests/services/GuardService.test.ts` - 関連ドキュメント収集のテストを保持

### 8.3 非推奨警告のテスト

組み込み種別使用時の警告表示をテストする：

```typescript
test('eutelo add prd shows deprecation warning', async () => {
  const result = await runCommand('eutelo add prd test-feature');
  expect(result.stderr).toContain('deprecated');
  expect(result.stderr).toContain('eutelo.config.*');
});
```

---

## 9. 移行ガイド

### 9.1 `eutelo graph` コマンドの代替

| 削除コマンド | 代替方法 |
|------------|---------|
| `eutelo graph build` | 削除。グラフの可視化が必要な場合は、外部ツールを使用 |
| `eutelo graph show` | 削除。ドキュメントの関係性は`eutelo guard`の出力で確認 |
| `eutelo graph impact` | 削除。影響範囲は`eutelo guard`の関連ドキュメント収集機能で確認 |
| `eutelo graph summary` | 削除。統計情報が必要な場合は、設定ファイルやドキュメント構造から確認 |
| `eutelo graph related` | 削除。`eutelo guard`の関連ドキュメント収集機能で代替 |

### 9.2 `eutelo config inspect` の代替

設定ファイル（`eutelo.config.*`）を直接確認する。

### 9.3 組み込みドキュメント種別の移行

1. `eutelo.config.ts`でカスタム種別を定義
2. `eutelo add <kind>`を使用

**例:**
```typescript
// eutelo.config.ts
export default defineConfig({
  scaffold: {
    'feature.prd': {
      id: 'feature.prd',
      kind: 'prd',
      path: 'product/features/{FEATURE}/PRD-{FEATURE}.md',
      template: '_template-prd.md',
      // ...
    }
  }
});
```

```bash
# カスタム種別を使用
eutelo add prd <feature>
```

---

## 10. 非機能要件

### 10.1 パフォーマンス

- 削除により、CLIの起動時間が短縮される可能性がある
- 不要なコマンドの登録処理が削減される

### 10.2 保守性

- コードベースの複雑性が削減される
- テスト対象が削減される
- ドキュメントの保守負荷が削減される

### 10.3 後方互換性

- 組み込み種別は非推奨とするが、動作は維持
- 破壊的変更（`eutelo graph`, `eutelo config inspect`の削除）を許容

---

## 11. 実装順序

1. **Phase 1: 非推奨警告の追加**
   - `eutelo add`の組み込み種別に非推奨警告を追加
   - テストを追加

2. **Phase 2: オプションの削除**
   - `eutelo init --placeholder-format`の削除
   - `eutelo guard --japanese`の削除
   - テストを更新

3. **Phase 3: コマンドの削除**
   - `eutelo graph`コマンド全体の削除
   - `eutelo config inspect`コマンドの削除
   - 関連テストの削除

4. **Phase 4: ドキュメント更新**
   - READMEの更新
   - 移行ガイドの追加
   - CHANGELOGの更新

---

## 12. リスクと対策

### 12.1 後方互換性の破壊

**リスク**: 既存ユーザーが`eutelo graph`コマンドを使用している場合、影響が発生する

**対策**:
- 移行ガイドを提供
- バージョン番号をメジャーアップ（破壊的変更として明示）
- リリースノートで変更を明記

### 12.2 機能不足の懸念

**リスク**: グラフ機能を削除することで、一部ユーザーの要望に応えられなくなる可能性

**対策**:
- 内部実装として必要な機能は保持
- 外部ツールの使用を推奨
- 将来の拡張性を考慮した設計を維持

---

## 13. 将来の検討事項

- 組み込み種別の完全削除（非推奨期間を経て）
- グラフ機能の外部パッケージ化（必要に応じて）
- 設定ファイルの検証ツール（`eutelo config inspect`の代替）

---

## References

- [PRD-EUTELO-FEATURE-SIMPLIFICATION](../../features/EUTELO-FEATURE-SIMPLIFICATION/PRD-EUTELO-FEATURE-SIMPLIFICATION.md) - 機能簡素化PRD
- [PRD-EUTELO-CORE](../../features/CORE/PRD-EUTELO-CORE.md) - Eutelo Core機能PRD
- [PRD-DOC-GRAPH](../../features/DOC-GRAPH/PRD-DOC-GRAPH.md) - グラフ機能PRD（削除対象）
- [Vision and Core Values](../../../philosophy/vision-and-core-values.md) - Euteloのビジョンとコアバリュー

