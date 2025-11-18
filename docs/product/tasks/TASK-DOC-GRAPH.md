---
id: TASK-DOC-GRAPH
type: task
feature: doc-graph
title: Document Graph Dependency Visibility タスク計画
purpose: >
  PRD/BEH/DSG-DOC-GRAPH で定義したグラフ生成・探索・波及分析機能を
  TDD（Red→Green→Refactor）で実装する。
status: todo
version: 0.1.0
owners: ["@AkhrHysd"]
related: [PRD-DOC-GRAPH, BEH-DOC-GRAPH, DSG-DOC-GRAPH]
due: "2025-12-01"
estimate:
  ideal_days: 5
  realistic_days: 8
  pessimistic_days: 12
last_updated: "2025-11-16"
---

# TSK-DOC-GRAPH

## Target BEH Scenarios
- BEH-DOC-GRAPH Scenario: `graph build --format=json`
- BEH-DOC-GRAPH Scenario: `graph show PRD-*`
- BEH-DOC-GRAPH Scenario: `graph impact {doc}`
- BEH-DOC-GRAPH Scenario: `graph summary`
- BEH-DOC-GRAPH Scenario: `graph build` JSON reuse in CI

観察ポイント: 全ノード走査の成功系、欠損ノード警告、1/2-hop 影響列挙、俯瞰メトリクス表示、CI 向け JSON エクスポート。

## TDD Plan
### Red（再現テストを先に書く）
- [ ] GraphBuilder/ImpactAnalyzer/Serializer のユニットテストを先に作成
- [ ] CLI コマンド（build/show/impact/summary）の E2E テストで未実装エラーを確認
- [ ] CI エクスポート時の JSON スキーマ検証テストを Red で用意

### Green（最小実装）
- [ ] DocumentScanner + RelationExtractor でノード/エッジ抽出を実装
- [ ] ImpactAnalyzer の BFS と hop ラベリングを通す
- [ ] CLI コマンドの引数・出力整形を BEH と一致させる

### Refactor（設計の整理）
- [ ] relation 定義と serializer を configurability の高いモジュールに分離
- [ ] Commander 層の出力フォーマットを presenter 経由に整理
- [ ] Graph schema と integrity レポートを `types/` に移し使い回す

## Acceptance Criteria
- [ ] `eutelo graph build --format=json` が nodes/edges/integrity を含む JSON を出力し exit 0
- [ ] `graph show` が upstream/downstream を表形式/JSON で表示し親子関係を正しく列挙
- [ ] `graph impact` が hop 別優先度で BEH/DSG/ADR/TASK を提示
- [ ] `graph summary` が feature 別統計・孤立ノード警告を返す
- [ ] CI で生成した graph.json を後続ジョブが参照でき、壊れていれば exit 2

## Definition of Done (DoD)
- テスト：
  - [ ] CLI コマンド群の E2E テストと core ユニットテストが Red→Green を経て常時グリーン
  - [ ] JSON スキーマ検証と hop 解析のケース網羅
- ドキュメント：
  - [ ] PRD / BEH / DSG のリンクと更新差分を反映
  - [ ] `docs/product/architecture/design/DOC-GRAPH/` にアーキ補足を追記（必要なら ADR 起票）
- 運用：
  - [ ] CI サンプルワークフローに `graph build` が組み込まれ、成果物を artifact 化

## Work Breakdown

### 1. Core Graph Pipeline
- [ ] DocumentScanner: glob + frontmatter 抽出（Red→Green）
- [ ] RelationExtractor: parent / references / mentions を edge に変換
- [ ] GraphBuilder: adjacency list + integrity (orphan/dangling/cycle) レポート

### 2. Impact & Summary Services
- [ ] ImpactAnalyzer: BFS hop + priority tagging + reason 生成
- [ ] IntegrityChecker: 孤立ノード・循環の検出、summary 表示用 DTO
- [ ] GraphSummaryPresenter: feature 別集計 & 警告フォーマット

### 3. CLI Commands
- [ ] `graph build`：`--format json|mermaid`、`--output`、exit code 0/2
- [ ] `graph show <doc>`：親子一覧 / JSON 出力
- [ ] `graph impact <doc>`：1-hop=must、2-hop=should、3-hop=info
- [ ] `graph summary`：統計と integrity 警告

### 4. CI / Distribution
- [ ] `graph build --format=json --output=graph.json` の workflow サンプル
- [ ] graph schema (`types/doc-graph.ts`) と `distribution/templates/graph.schema.json`
- [ ] 他モジュール（doc-guard など）が graph.json を取り込むための contract doc

## Risks / Dependencies
- リスク：frontmatter 欠損ドキュメントが多い場合、グラフ欠落で価値が下がる
- リスク：大規模 repo での性能劣化（I/O 並列化が必要）
- 依存：doc-scaffold / doc-lint による構造整備、graph schema に依存する周辺機能

## Notes
- 将来の暗黙的エッジ（LLM 推論）は次フェーズ。現在は明示的 parent / mentions のみ。
- graph.json は `node_modules/.cache` などに置かず `dist/graph/` を検討。
- Mermaid/Graphviz など可視化フォーマットはオプション扱いでフェーズ2予定。

