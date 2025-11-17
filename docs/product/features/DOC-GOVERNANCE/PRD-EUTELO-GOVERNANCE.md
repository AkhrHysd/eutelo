---
id: PRD-EUTELO-GOVERNANCE
type: prd
feature: EUTELO-GOVERNANCE
title: Eutelo ドキュメント統治モジュール
purpose: >
  docs/ 配下のドキュメント体系全体について、「ルールが守られているか」と
  「体系として破綻していないか」を継続的に監視・補助する統治層を提供する。
  人手のレビューだけに依存せず、目的・構造・ライフサイクルの一貫性を保つことが目的。
status: draft
version: 0.1
parent: PRD-EUTELO-CORE
owners: ["@林田晃洋"]
tags: ["eutelo", "governance", "docs"]
last_updated: "2025-11-16"
---

# PRD-EUTELO-GOVERNANCE

## Background

Eutelo にはすでに以下が存在する。

- ESLint/Biome による静的ガードレール（形式ルール）
- LLM ガードレールによる意味整合チェック
- ドキュメント依存関係グラフ（EUTELO-GRAPH, 別PRD）

ただし、これらは「単発のチェック」「単発の解析」であり、
以下のような **“継続的な統治”** の観点はまだ弱い。

- 新しい機能 PRD を追加したときに、
  - docs/README や INDEX の更新が自動的にサジェストされない
- 廃止された機能や古いPRDがどれかを体系として把握しづらい
- ドキュメント種別ごとのライフサイクル（draft → review → active → deprecated）が入口だけで管理されている

これらを補完する「ドキュメント統治モジュール」を設ける。

## Goals / KPI

- docs/ 配下の「ルール違反」「放置ドキュメント」「孤立ドキュメント」を自動検出し、レポートできること。
- 新しいPRD/BEH/DSG追加時に、必要な付帯作業（index更新、parent設定など）のサジェストを出せること。
- 廃止・統合対象のドキュメント候補を定期的に提示できること。

## Scope（概要）

### In Scope

- docs/ 配下のメタデータ・構造・依存関係を定期的にスキャンし、「健全性レポート」を生成する機能
- 以下のようなガバナンスチェックルールの定義と実行:
  - parent を持たない PRD が一定数以上増えていないか
  - 依存関係グラフ上で「孤立している」ドキュメントがないか
  - deprecated フラグが付いた文書に対して、子ドキュメントが active のまま残っていないか
- `eutelo gov report` のような CLI コマンドで、週次/PR 時点の統治レポートを確認できること
- 将来的な GitHub Actions のスケジュール実行（週1の docs 健康診断）

### Out of Scope（初期）

- Web ダッシュボードでの可視化（別機能）
- 人事・組織構造との連携（誰の責任かまでを自動推論すること）

## Requirements（サマリ）

- FR（例）
  - FR-1: docs/ をスキャンし、構造・メタデータ・依存関係を統合して「健全性レポート」を出力できる。
  - FR-2: 新規ドキュメント追加時に、index更新や parent 設定などの TODO を CLI でサジェストできる。
  - FR-3: deprecated/archived 状態の文書と、その子孫ドキュメントの整合をチェックできる。
- NFR（例）
  - NFR-1: Eutelo Graph や LLM ガードレールと独立して利用可能であること。
  - NFR-2: CI/定期ジョブに組み込める実行時間・インターフェイスであること。

## Open Questions

- 状態管理（draft / review / active / deprecated / archived）を frontmatter でどこまで標準化するか。
- 「違反を検出したとき、どこまで自動修正するか」（index の追記などを自動 commit するかどうか）。
- 組織ごとのガバナンスポリシー差異をどの程度設定可能にするか。