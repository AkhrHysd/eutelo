---
id: DSG-DOC-GRAPH
type: design
feature: doc-graph
title: Document Graph Dependency Visibility 設計仕様
purpose: >
  eutelo-docs 内のドキュメント同士の関係をグラフ構造として抽出・提供する
  Eutelo Graph 機能の内部構造とデータモデルを定義する。
status: draft
version: 0.1.0
parent: PRD-DOC-GRAPH
owners: ["@AkhrHysd"]
tags: ["doc-graph", "design"]
last_updated: "2025-11-16"
---

# DSG-DOC-GRAPH

## Background

PRD-EUTELO-GRAPH は、PRD/BEH/DSG/ADR/TASK など多種類のドキュメントを  
「点」ではなく「ネットワーク」として扱うことをゴールに掲げている。

本設計は以下を満たすために策定する：

1. 全文書から関係構造を抽出し共有できる単一ソースを提供する  
2. 任意の文書から前後関係・波及影響をトラバースできる  
3. CLI / CI / 他モジュールから同じグラフを利用できる

## Goals

- 文書体系を `nodes` と `edges` に正規化し API/CLI で配布できる
- 変更対象を入力すると 1-hop/2-hop の影響リストを生成できる
- 前提となる frontmatter（id/parent/purpose/tags）変化に追従しやすい
- Graph を JSON/Graphviz など複数フォーマットで出力できる

## Overview

Graph 機能は既存の monorepo 構造に沿って 3 つのレイヤに分割する。

```
packages/
  cli/
    src/commands/graph/
      build.ts   # 全体グラフ生成
      show.ts    # 単一ノード可視化
      impact.ts  # 波及影響列挙
      summary.ts # 俯瞰メトリクス
  core/
    src/graph/
      DocumentScanner.ts   # ファイル列挙 & frontmatter 抽出
      RelationExtractor.ts # parent / references / tags からエッジ決定
      GraphBuilder.ts      # nodes/edges を構築
      ImpactAnalyzer.ts    # hop/階層計算
      Serializer.ts        # JSON/Mermaid 変換
      IntegrityChecker.ts  # 孤立/循環の検出
  commander/
    src/graph/
      GraphSummaryPresenter.ts  # CLI表示フォーマット
      GraphCache.ts             # CI間で共有するキャッシュ I/F
```

CI では `graph build` の成果物（graph.json）を `distribution/` へ配置し、  
doc-guard や将来の UI レイヤが同じファイルを再利用する。

## Structure

### DocumentScanner

- `docs/product/**/PRD-*.md` などのパターンを `glob` で列挙
- frontmatter を `gray-matter` で解析し、Document エンティティに変換
- 解析できないファイルは警告扱いで nodes へ含めつつ `validation` フラグを付与

### RelationExtractor

- parent, related, references, tags を統一的に扱うルールを持つ
- 既知のリレーション種別：
  - `parent` : SUB-PRD ↔ PRD, BEH ↔ PRD, DSG ↔ PRD
  - `derivesFrom` : ADR → PRD, TASK → PRD/BEH
  - `mentions` : 本文内 `@document-id` の記法
- 不明な参照は `dangling` エッジとして格納し、summary で報告する

### GraphBuilder

- nodes: `{ id, type, feature, title, purposeHash }`
- edges: `{ from, to, relation, confidence }`
- 同一 relation が複数回検出された場合は weight を累積
- Graph 内部表現として `adjacency list` + `reverse adjacency` を保持し ImpactAnalyzer へ渡す

### ImpactAnalyzer

- 指定ノードから BFS で hop を計測し、`{nodeId, hop, reason}` を返す
- `hop <= 2` を「必須レビュー」、`hop == 3` を「参考」と分類
- 結果には edge 種別を含めレビュー観点を表示できるようにする

### Serializer

- JSON（デフォルト）: `graph.schema.json` に従う
- Mermaid: `graph export --format=mermaid --depth=2` で部分グラフを描画
- Graphviz: 拡張用

### IntegrityChecker

- 孤立ノード: in-degree = out-degree = 0 のノードをリスト化
- 循環検出: parent リレーションで循環がある場合はエラー
- 欠損 parent: エッジ種別 `dangling` を生成し、summary で警告

## Contracts

Graph JSON の仕様（`graph.schema.json`）：

```jsonc
{
  "$schema": "https://eutelo.dev/schemas/doc-graph.json",
  "version": "0.1.0",
  "generatedAt": "2025-11-16T10:00:00Z",
  "nodes": [
    { "id": "PRD-DOC-GRAPH", "type": "prd", "feature": "doc-graph", "title": "Eutelo ドキュメント依存関係グラフ" }
  ],
  "edges": [
    { "from": "PRD-DOC-GRAPH", "to": "BEH-DOC-GRAPH", "relation": "defines", "confidence": 1 }
  ],
  "integrity": {
    "orphanNodes": [],
    "danglingEdges": [],
    "cycles": []
  }
}
```

CLI から `--output=graph.json` を指定するとこの構造が永続化される。  
CI は生成日時とバージョンでキャッシュを判別する。

## Non-Functional Aspects

- **Performance**: 500 ドキュメント規模で 1 秒以内に完了することを目標に、I/O は並列読み込み、BFS はメモリ常駐で行う
- **Resilience**: 不正な frontmatter があってもプロセスを止めず、欠損ノードは `integrity` セクションに集約
- **Extensibility**: relation 種別は `relations.yml` で定義し、追加時に core を再コンパイルせず読込できるようにする
- **Interoperability**: 出力 JSON は doc-lint / doc-guard / future UI が同一 schema で受け取れる

## Future Considerations

- 分散キャッシュ（GraphQL API）を infrastructure 層に拡張する
- LLM による推論エッジ（暗黙的関係）の取り込みは次フェーズで検討
- グラフのバージョン差分（delta）を生成し、変更レビューで利用する仕組みを追加予定

---
