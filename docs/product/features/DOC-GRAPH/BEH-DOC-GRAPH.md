---
id: BEH-DOC-GRAPH
type: behavior
feature: doc-graph
title: Document Graph Dependency Visibility 振る舞い仕様
purpose: >
  eutelo-docs 内の PRD / BEH / DSG / ADR / TASK を、点ではなくネットワークとして扱い、
  変更や参照関係を素早く追跡できるようにする挙動を定義する。
status: draft
version: 0.1
parent: PRD-DOC-GRAPH
owners: ["@林田晃洋"]
tags: ["doc-graph", "behavior", "dependencies"]
last_updated: "2025-11-16"
---

# BEH-DOC-GRAPH

Eutelo Graph は文書体系をグラフ構造として読み出し、  
CLI / CI / 他サービスが同じ構造物にアクセスできる状態を提供する。

本 BEH は「グラフを生成・探索・影響評価する際の観察可能な挙動」を規定する。

---

## Feature: eutelo graph builds and queries the document dependency network

---

### Scenario: 全文書を走査してグラフを生成する

```gherkin
Given eutelo-docs/product/ 配下に複数の PRD/BEH/DSG/ADR/TASK が存在する
  And それぞれの frontmatter に id / parent / feature / tags が定義されている
When ユーザーが "eutelo graph build --format=json" を実行する
Then CLI は全ファイルを走査しノードとエッジのセットを構築する
  And JSON には nodes[{id,type,feature}] と edges[{from,to,relation}] が含まれる
  And exit code は 0 である
```

---

### Scenario: 任意の文書から隣接関係を探索する

```gherkin
Given PRD-AUTH.md の parent が PRD-EUTELO-CORE である
  And BEH-AUTH.md / DSG-AUTH.md / ADR-AUTH-0001.md が PRD-AUTH.md を参照している
When "eutelo graph show PRD-AUTH.md" を実行する
Then CLI は upstream/downstream ノードを表形式または JSON で表示する
  And PRD-AUTH.md ← PRD-EUTELO-CORE の上位エッジが表示される
  And PRD-AUTH.md → {BEH,DSG,ADR} の下位エッジが表示される
```

---

### Scenario: 変更対象から波及影響を列挙する

```gherkin
Given ユーザーが PRD-AUTH.md を変更対象に指定した
  And graph モデルには PRD-AUTH.md と隣接する BEH / DSG / ADR / TASK が含まれている
When "eutelo graph impact PRD-AUTH.md" を実行する
Then CLI は 1-hop / 2-hop で影響する候補ドキュメントを優先度付きで列挙する
  And BEH-AUTH.md および DSG-AUTH.md が "must review" として表示される
  And exit code は 0 である
```

---

### Scenario: ドキュメント体系の俯瞰サマリを提供する

```gherkin
Given プロジェクトに複数の feature ディレクトリが存在する
When "eutelo graph summary" を実行する
Then CLI は feature ごとの文書数 / 未接続ノード数 / 断絶チェーンを指標として表示する
  And 断絶ノードが存在する場合は警告として出力される
```

---

### Scenario: CI から JSON グラフを取得し周辺サービスが再利用する

```gherkin
Given CI で "eutelo graph build --format=json --output=graph.json" が実行される
When 後続ジョブが graph.json を読み込む
Then グラフ JSON には timestamp / version / nodes / edges が含まれる
  And 他ジョブは nodes[*].id をキーに追加メタデータを付与できる
  And 形式が壊れている場合は graph build コマンドが exit code 2 を返す
```

---

## Expected Outcomes

- 文書体系をネットワークとして認識できる一貫した CLI が提供される
- 任意の文書から隣接関係・波及影響を即座に得られる
- CI/他サービスが同じグラフ構造を共有できるため、属人的な把握に依存しない

---
