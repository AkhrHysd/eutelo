---
id: PRD-DOC-GUARD-GRAPH-INTEGRATION
type: prd
feature: doc-guard-graph-integration
title: Guard × Graph 連携 - 関連ドキュメント自動探索機能
purpose: >
  eutelo guard コマンドが eutelo graph の機能を活用し、
  指定されたドキュメントの parent・related 関係を自動的にたどって
  関連ドキュメントを収集し、複数ドキュメント間の整合性チェックを
  効果的に実行できるようにする。
status: draft
version: 0.1
parent: PRD-DOC-GUARD
owners: ["@AkhrHysd"]
tags: ["doc-guard", "doc-graph", "integration", "llm-check"]
last_updated: "2025-11-27"
---

# PRD-DOC-GUARD-GRAPH-INTEGRATION

Guard × Graph 連携 - 関連ドキュメント自動探索機能

---

## Purpose

eutelo guard は LLM を用いた複数ドキュメント間の整合性チェックを提供するが、
現状では **ユーザーが明示的に複数ドキュメントを指定する必要がある**。

単一ドキュメントを指定した場合、比較対象がないため整合性チェックが機能しない問題がある。

本機能は以下を実現する：

1. **parent 関係の自動追跡**: 指定ドキュメントの parent を自動的にたどり、上位ドキュメントを収集
2. **related 関係の自動収集**: 同一 feature 内の関連ドキュメント（PRD↔BEH↔DSG 等）を自動収集
3. **深さ制御オプション**: 探索深さを指定可能にし、必要に応じて全先祖・全関連を取得
4. **graph との連携**: ドキュメント探索ロジックを eutelo graph に委譲し責務を分離

これにより、ユーザーは **単一ドキュメントを指定するだけで** 関連ドキュメント群の整合性チェックを実行できる。

---

## Background

### 現状の問題

1. **単一ドキュメント指定時の無効化**
   - `eutelo guard docs/PRD-AUTH.md` のように1ファイルのみ指定した場合、
     比較対象がないため LLM は「問題なし」と判定してしまう
   - ユーザーは期待した整合性チェックが行われていないことに気づきにくい

2. **関連ドキュメントの手動指定が煩雑**
   - PRD の整合性をチェックするには、関連する BEH / DSG / ADR を全て手動で列挙する必要がある
   - プロジェクト規模が大きくなると、関連ドキュメントの把握自体が困難

3. **graph との責務分離**
   - ドキュメント間の関係性探索は graph の責務
   - guard が独自に関係性を解析するのは重複であり、一貫性を損なう

### 解決アプローチ

- guard は graph の機能を活用して関連ドキュメントを自動収集
- デフォルトで直近の関連（depth=1）を収集し、オプションで深さを制御
- `--all` オプションで全ての先祖・関連を一括取得可能に

---

## Goals / KPI

- **利便性向上**: 単一ドキュメント指定でも整合性チェックが有効に機能する率 **100%**
- **探索精度**: parent / related 関係の自動収集精度 **> 95%**
- **パフォーマンス**: 関連ドキュメント探索のオーバーヘッド **< 500ms**（depth=2 まで）
- **ユーザー体験**: 関連ドキュメント収集状況をログで確認可能

---

## Scope

### In Scope

- **graph 連携による関連ドキュメント探索**
  - parent 関係の上位ドキュメント取得
  - related 関係の関連ドキュメント取得
  - mentions 関係（本文内参照）の関連ドキュメント取得

- **CLI オプション拡張**
  - `--with-related`: 関連ドキュメント自動収集を有効化（デフォルト有効）
  - `--no-related`: 関連ドキュメント自動収集を無効化
  - `--depth=N`: 探索深さの指定（デフォルト: 1）
  - `--all`: 深さ無制限で全関連ドキュメントを取得

- **graph 側の機能追加**
  - `eutelo graph related <document>`: 指定ドキュメントの関連ドキュメント一覧取得
  - 探索深さ・方向（upstream/downstream/both）のオプション

- **ログ・レポート**
  - 収集された関連ドキュメントの一覧表示
  - 探索深さ・収集件数のサマリ

### Out of Scope

- 関連ドキュメントの内容に基づく重要度判定（LLM 判断に委ねる）
- graph キャッシュの最適化（別タスクで対応）
- UI / ダッシュボードでの可視化

---

## Requirements

### Functional Requirements（FR）

#### Guard 側

- **FR-G01**: `eutelo guard <document>` 実行時、デフォルトで関連ドキュメントを自動収集する
- **FR-G02**: `--no-related` オプションで自動収集を無効化できる
- **FR-G03**: `--depth=N` オプションで探索深さを指定できる（デフォルト: 1）
- **FR-G04**: `--all` オプションで深さ無制限の探索を実行できる
- **FR-G05**: 収集された関連ドキュメント一覧を `--format=json` で確認できる
- **FR-G06**: 関連ドキュメントが見つからない場合、警告を出力して続行する
- **FR-G07**: graph が未構築の場合、自動的に必要な範囲で構築する

#### Graph 側

- **FR-GR01**: `eutelo graph related <document>` コマンドで関連ドキュメントを取得できる
- **FR-GR02**: `--depth=N` オプションで探索深さを指定できる
- **FR-GR03**: `--direction=upstream|downstream|both` で探索方向を指定できる
- **FR-GR04**: `--format=json|text` で出力形式を選択できる
- **FR-GR05**: 指定ドキュメントが存在しない場合、適切なエラーを返す

### Non-Functional Requirements（NFR）

- **NFR-01**: 関連ドキュメント探索は 500ms 以内に完了する（depth=2、500 ドキュメント規模）
- **NFR-02**: graph 構築のオーバーヘッドを最小化するため、必要なノードのみ解析する
- **NFR-03**: 循環参照が存在する場合、無限ループを回避し警告を出力する
- **NFR-04**: メモリ使用量は 100MB 以下を維持する

---

## User Stories

### US-1: 単一 PRD の整合性チェック

```bash
# 従来: 関連ドキュメントを手動で列挙
eutelo guard docs/PRD-AUTH.md docs/BEH-AUTH.md docs/DSG-AUTH.md

# 改善後: 単一指定で関連ドキュメントを自動収集
eutelo guard docs/PRD-AUTH.md
# → PRD-AUTH の parent（PRD-CORE）、関連（BEH-AUTH, DSG-AUTH）を自動収集
```

### US-2: 深い階層の整合性チェック

```bash
# 全ての先祖ドキュメントまで含めてチェック
eutelo guard docs/SUB-PRD-AUTH-OAUTH.md --all
# → SUB-PRD → PRD-AUTH → PRD-CORE と全先祖、
#   および各レベルの BEH/DSG を収集
```

### US-3: CI での限定的チェック

```bash
# パフォーマンス重視で直近の関連のみチェック
eutelo guard docs/PRD-AUTH.md --depth=1 --ci
```

### US-4: 関連ドキュメントの確認

```bash
# guard 実行前に収集されるドキュメントを確認
eutelo graph related docs/PRD-AUTH.md --depth=2
```

---

## Success Criteria

- 単一ドキュメント指定で、関連する PRD/BEH/DSG/ADR 間の整合性問題を検出できる
- `--depth` オプションで探索範囲を柔軟に制御できる
- graph 機能との連携がシームレスで、責務が明確に分離されている
- CI 環境で安定して動作し、パフォーマンス要件を満たす

---

## Dependencies / Related

- **PRD-DOC-GUARD**: guard 本体の仕様
- **PRD-DOC-GRAPH**: graph 本体の仕様
- **DSG-DOC-GUARD-GRAPH-INTEGRATION**: 本機能の設計仕様
- **BEH-DOC-GUARD**: guard の振る舞い仕様（更新が必要）

---

## Risks / Assumptions

### Risks

- **R-1**: プロジェクト規模が大きい場合、`--all` オプションで LLM への入力が過大になる
  - 対策: トークン数制限・重要度フィルタリングの導入を検討
- **R-2**: 循環参照が多い場合、探索時間が増大する
  - 対策: visited セットによる重複排除、タイムアウト設定
- **R-3**: graph 構築コストが guard 実行のボトルネックになる可能性
  - 対策: インクリメンタル構築、キャッシュの活用

### Assumptions

- frontmatter の parent / related フィールドが正しく設定されている
- graph 機能が正常に動作している
- LLM は複数ドキュメント入力を適切に処理できる

---

## Notes

- 本機能は guard と graph の連携の第一歩であり、将来的には以下への発展を想定：
  - 変更影響分析との統合（impact + guard）
  - LLM による暗黙的関係の推論
  - 整合性問題の自動修正提案

---

## References

- PRD-DOC-GUARD
- PRD-DOC-GRAPH
- DSG-DOC-GRAPH
- BEH-DOC-GRAPH

---

