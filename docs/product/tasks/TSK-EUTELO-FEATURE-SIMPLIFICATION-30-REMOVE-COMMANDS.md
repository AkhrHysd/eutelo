---
id: TSK-EUTELO-FEATURE-SIMPLIFICATION-30-REMOVE-COMMANDS
type: task
feature: EUTELO-FEATURE-SIMPLIFICATION
title: 不要なコマンドの削除
purpose: >
  `eutelo graph`コマンド全体と`eutelo config inspect`コマンドを削除し、
  コアバリューに集中したシンプルなエコシステムを実現する。
status: pending
version: 0.1
owners: ["@AkhrHysd"]
related: [PRD-EUTELO-FEATURE-SIMPLIFICATION, DSG-EUTELO-FEATURE-SIMPLIFICATION]
due: ""
estimate:
  ideal_days: 2
  realistic_days: 3
  pessimistic_days: 5
last_updated: "2025-01-27"
---

# TSK-EUTELO-FEATURE-SIMPLIFICATION-30-REMOVE-COMMANDS

## Target BEH Scenarios
- `eutelo graph`コマンド全体が削除され、エラーまたは「unknown command」が表示される
- `eutelo config inspect`コマンドが削除され、エラーまたは「unknown command」が表示される
- `eutelo guard`は正常に動作し、内部実装としてグラフ機能を使用し続ける
- 内部実装として必要なグラフ機能は保持される

## TDD Plan
### Red
- [ ] 削除されたコマンドがエラーになることを検証するテストを書く
- [ ] `eutelo guard`が正常に動作することを検証するテストを書く
- [ ] 内部実装としてグラフ機能が使用できることを検証するテストを書く

### Green
- [ ] `eutelo graph`コマンド定義を削除
- [ ] `eutelo config inspect`コマンド定義を削除
- [ ] 関連するヘルパー関数を削除
- [ ] 型定義を削除
- [ ] テストファイルを削除または更新

### Refactor
- [ ] 不要になったインポートを整理
- [ ] コメントを更新

## Acceptance Criteria
- [ ] `eutelo graph build`がエラーになる
- [ ] `eutelo graph show <documentId>`がエラーになる
- [ ] `eutelo graph impact <documentId>`がエラーになる
- [ ] `eutelo graph summary`がエラーになる
- [ ] `eutelo graph related <documentPath>`がエラーになる
- [ ] `eutelo config inspect`がエラーになる
- [ ] `eutelo guard`は正常に動作する
- [ ] 内部実装としてグラフ機能が使用できる

## DoD
- [ ] すべての`eutelo graph`サブコマンドが削除されている
- [ ] `eutelo config inspect`コマンドが削除されている
- [ ] 関連するヘルパー関数が削除されている
- [ ] 型定義が削除されている
- [ ] テストファイルが削除または更新されている
- [ ] 内部実装として必要なグラフ機能が保持されている
- [ ] コードレビューが完了している

## Implementation Details

### 変更対象ファイル
- `packages/cli/src/index.ts`
- `packages/cli/tests/graph.e2e.test.js`（削除）
- `packages/cli/tests/config.e2e.test.js`（更新）

### 実装内容

#### 1. `eutelo graph`コマンドの削除

**削除対象:**
- `graph`コマンド定義（行1090-1212）
  - `graph build`コマンド（行1090-1112）
  - `graph show <documentId>`コマンド（行1114-1134）
  - `graph impact <documentId>`コマンド（行1136-1157）
  - `graph summary`コマンド（行1159-1179）
  - `graph related <documentPath>`コマンド（行1181-1212）
- `runGraphBuildCommand`関数（行390-418）
- `runGraphShowCommand`関数（行420-439）
- `runGraphImpactCommand`関数（行441-465）
- `runGraphSummaryCommand`関数（行467-502）
- `runGraphRelatedCommand`関数（行504-586）
- `GraphBuildCliOptions`型（行72-75）
- `GraphImpactCliOptions`型（行77-79）
- `GraphRelatedCommandOptions`型（行504-513）
- `GraphOutputFormat`型（行388）
- `normalizeGraphFormat`関数（行588-597）

**保持する内部実装:**
- `packages/core/src/graph/RelatedDocumentResolver.ts`
- `packages/core/src/graph/GraphBuilder.ts`
- `packages/core/src/graph/DocumentScanner.ts`
- `packages/core/src/graph/ImpactAnalyzer.ts`
- `packages/core/src/services/GraphService.ts`

**削除コード例:**
```typescript
// 削除: graph コマンド定義
const graph = program.command('graph').description('Inspect the document dependency graph');

graph
  .command('build')
  .description('Scan eutelo-docs and output the document graph')
  // ... 削除

// 削除: ヘルパー関数
async function runGraphBuildCommand(...) { ... }  // 削除
async function runGraphShowCommand(...) { ... }    // 削除
async function runGraphImpactCommand(...) { ... }  // 削除
async function runGraphSummaryCommand(...) { ... } // 削除
async function runGraphRelatedCommand(...) { ... }  // 削除

// 削除: 型定義
type GraphBuildCliOptions = { ... };  // 削除
type GraphImpactCliOptions = { ... }; // 削除
type GraphRelatedCommandOptions = { ... }; // 削除
type GraphOutputFormat = 'json' | 'mermaid'; // 削除

// 削除: 関数
function normalizeGraphFormat(...) { ... } // 削除
```

#### 2. `eutelo config inspect`コマンドの削除

**削除対象:**
- `configCommand.inspect`コマンド定義（行1214-1225）
- `runConfigInspect`関数（行303-320）
- `ConfigInspectOptions`型（行81-84）
- `normalizeConfigInspectFormat`関数（行322-331）
- `renderConfigInspection`関数（行333-386）

**削除コード例:**
```typescript
// 削除: config inspect コマンド定義
configCommand
  .command('inspect')
  .description('Resolve eutelo.config.* and presets, showing merged values')
  // ... 削除

// 削除: ヘルパー関数
async function runConfigInspect(...) { ... }  // 削除
function normalizeConfigInspectFormat(...) { ... }  // 削除
function renderConfigInspection(...) { ... }  // 削除

// 削除: 型定義
type ConfigInspectOptions = { ... };  // 削除
```

#### 3. インポートの整理

`GraphService`のインポートは`GuardService`が使用するため保持する。

### テスト更新

#### 削除するテストファイル
- `packages/cli/tests/graph.e2e.test.js` - 完全に削除

#### 更新するテストファイル
- `packages/cli/tests/config.e2e.test.js` - `inspect`関連のテストを削除

#### 保持するテスト
- `packages/core/tests/graph/*.test.ts` - 内部実装のテストとして保持
- `packages/core/tests/services/GuardService.test.ts` - 関連ドキュメント収集のテストを保持

## Risks / Dependencies
- リスク: 既存ユーザーが`eutelo graph`コマンドを使用している場合、影響が発生する
- 対策: 移行ガイドを提供し、バージョン番号をメジャーアップ（破壊的変更として明示）
- 依存: TSK-EUTELO-FEATURE-SIMPLIFICATION-20-REMOVE-OPTIONS（完了後）

## Notes
- このタスクは破壊的変更を含むため、メジャーバージョンアップが必要
- 内部実装として必要なグラフ機能は保持し、`eutelo guard`が正常に動作することを確認
- 削除前にCHANGELOGで変更を明記し、移行ガイドを提供

