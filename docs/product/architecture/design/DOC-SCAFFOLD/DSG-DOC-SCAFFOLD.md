---
id: DSG-DOC-SCAFFOLD
type: dsg
feature: doc-scaffold
title: Document Scaffold & CI Integration 設計ガイド
purpose: >
  Eutelo が定義する標準ドキュメント構造を、
  既存プロジェクトに対して安全かつ非破壊的に配布・同期するための
  CLI / CI / テンプレート基盤の設計方針を定義する。
status: draft
version: 0.1
parent: PRD-DOC-SCAFFOLD
owners: ["@AkhrHysd"]
last_updated: "2025-11-14"
---

# DSG-DOC-SCAFFOLD  
Document Scaffold & CI Integration 設計ガイド

---

## 1. 概要

本設計ガイドは、`PRD-DOC-SCAFFOLD` で定義された機能要件を満たすための  
アーキテクチャ、コンポーネント構成、テンプレートの扱い、主要フローを記述する。

主な責務:

- Eutelo 標準ドキュメント構造の **初期生成 (`eutelo init`)**
- 不足テンプレートの **非破壊同期 (`eutelo sync`)**
- テンプレートからの **個別ドキュメント生成 (`eutelo add …`)**
- CI 用の **チェック / 非破壊同期モード**

対象となるドキュメント種別（テンプレートが存在するもののみ）:

- PRD / SUB-PRD
- BEH / SUB-BEH
- DSG
- ADR
- TASK
- OPS

---

## 2. スコープと非スコープ

### 2.1 スコープ

- `eutelo` CLI のうち、ドキュメント構造とテンプレ生成に関係する機能
- テンプレートの提供・展開ルール
- 非破壊な構造生成と追加ファイルの検出
- CI のための `--check-only` / `--ci` モード
- ドキュメント構造・命名規則・必須フィールド (`purpose` 等) の静的検証

### 2.2 非スコープ

- ドキュメント本文の生成（AI 等）  
- 意味的な purpose 整合判定（Doc-Guard 等の別機能に委譲）
- コード生成・モデルスキーマ生成

---

## 3. コンポーネント構成

### 3.1 CLI レイヤー

`eutelo` CLI は次のサブコマンドを公開する:

```text
eutelo init
eutelo sync
eutelo add prd {FEATURE}
eutelo add beh {FEATURE}
eutelo add sub-prd {FEATURE} {SUB}
eutelo add sub-beh {FEATURE} {SUB}
eutelo add dsg {FEATURE}
eutelo add adr {FEATURE}
eutelo add task {NAME}
eutelo add ops {NAME}
eutelo check
```

CLI は **引数パースとルーティングのみ** を行い、  
実処理は Application サービスに移譲する。

---

### 3.2 Application サービス層

- **ScaffoldService**
  - 標準構造の初期生成
  - 欠落テンプレートの検出・同期
- **TemplateService**
  - テンプレート読み取り・変数展開
- **AddDocumentService**
  - 種別ごとの `add` 実処理
- **ValidationService**
  - 構造・命名規則・frontmatter必須項目の検証
- **DryRunService**
  - 書き込みを行わずに差分を生成（CI/診断用）

---

### 3.3 Infrastructure レイヤー

- **FileSystemAdapter**
  - ファイル存在判定・非破壊書き込み
- **TemplateRepository**
  - パッケージ同梱テンプレートの参照
- **VcsAdapter（将来拡張）**
  - CI からの PR 自動生成などに対応可能

---

## 4. テンプレート設計

### 4.1 テンプレート配置ルール

テンプレートのソースは **`packages/distribution/templates/**`** に存在し、  
配布物としては `<pkgRoot>/templates/**` として参照される。

```text
<pkgRoot>/
  templates/
    features/
      prd.md
      sub-prd.md
      beh.md
      sub-beh.md
    design/
      dsg.md
    adr/
      adr.md
    tasks/
      task.md
    ops/
      ops.md
```

- CLI は `<pkgRoot>/templates/` をテンプレートのソース・オブ・トゥルースとする。
- プロジェクトローカルでのテンプレ上書き（例: `eutelo.templates/`）は  
  **将来拡張とし、本設計ではスコープ外**。
- テンプレートが存在しない種別は `eutelo add` でエラーとなる。

---

### 4.2 テンプレート変数の展開

テンプレートは `{VAR}` を含む。最低限サポートする変数:

- `{FEATURE}`  
- `{SUB}`
- `{DATE}`
- `{ID}`
- `{PARENT}`
- `{VERSION}`
- `{OWNERS}`

`TemplateService` がすべての変数を展開する。

---

## 5. ファイルパス・命名規則

外部プロジェクトとの競合を避けるため、  
Eutelo が生成するドキュメント群のルートは **`eutelo-docs/`** とする。

```text
eutelo-docs/
  product/
    features/
      {FEATURE}/
        PRD-{FEATURE}.md
        SUB-PRD-{SUB}.md
        BEH-{FEATURE}.md
        BEH-{FEATURE}-{SUB}.md

  architecture/
    design/
      {FEATURE}/
        DSG-{FEATURE}.md

    adr/
      {FEATURE}/
        ADR-{FEATURE}-{SEQ}.md

  tasks/
    TASK-{NAME}.md

  ops/
    OPS-{NAME}.md
```

### 5.1 features 配下

- PRD  
  - `eutelo-docs/product/features/{FEATURE}/PRD-{FEATURE}.md`
  - `id = PRD-{FEATURE}`
- BEH  
  - `eutelo-docs/product/features/{FEATURE}/BEH-{FEATURE}.md`
  - `parent = PRD-{FEATURE}`
- SUB-PRD  
  - `eutelo-docs/product/features/{FEATURE}/SUB-PRD-{SUB}.md`
  - `id = SUB-PRD-{SUB}`
  - `parent = PRD-{FEATURE}`
- SUB-BEH  
  - `eutelo-docs/product/features/{FEATURE}/BEH-{FEATURE}-{SUB}.md`
  - `parent = SUB-PRD-{SUB}`

### 5.2 design 配下（DSG）

- `eutelo-docs/architecture/design/{FEATURE}/DSG-{FEATURE}.md`
- `id = DSG-{FEATURE}`

### 5.3 adr 配下

- `eutelo-docs/architecture/adr/{FEATURE}/ADR-{FEATURE}-{SEQ}.md`
- `{SEQ}` = ゼロパディング連番

### 5.4 tasks / ops

- TASK  
  - `eutelo-docs/tasks/TASK-{NAME}.md`
- OPS  
  - `eutelo-docs/ops/OPS-{NAME}.md`

`ValidationService` はすべてのパス・命名規則・frontmatter必須項目を検証する。

---

## 6. 主要フロー設計

### 6.1 `eutelo init`

1. プロジェクトルートを特定  
2. `eutelo-docs/` の存在を確認  
3. なければ作成  
4. 標準ディレクトリ群を生成  
5. ガイド文書（テンプレートがある場合のみ）を生成  
6. すでに存在するファイルは上書きしない

異常系:
- 権限不足  
- 無効なプロジェクト構造

---

### 6.2 `eutelo sync`

1. 既存構造を走査  
2. テンプレに基づき「存在すべきファイル」集合を計算  
3. 不足分のみテンプレから生成  
4. `--check-only` は書き込み禁止  
5. 通常モードは非破壊生成 (`writeIfNotExists`) のみ行う

---

### 6.3 `eutelo add …`

共通フロー:

1. 種別と引数から生成対象を決定  
2. TemplateService でテンプレ解決  
3. 出力パス決定  
4. 既存チェック  
5. テンプレ変数展開  
6. 非破壊書き込み

種別ごとの追加仕様:

- PRD → `parent = PRINCIPLE-GLOBAL`
- BEH → `parent = PRD-{FEATURE}`
- SUB-PRD → `parent = PRD-{FEATURE}`
- SUB-BEH → `parent = SUB-PRD-{SUB}`
- ADR → 連番採番 (`0001` 形式)

---

## 7. CI 連携設計

### 7.1 実行モード

- `--check-only`  
  書き込み禁止、戻り値で状態を返す
- `--ci`  
  CI 向けログ整形
- `--format=json`  
  JSON レポート

### 7.2 戻り値規約

- `0`: 問題なし  
- `1`: 不足テンプレあり  
- `2`: 構造/命名/必須項目の問題あり  
- `>2`: 実行エラー

---

## 8. エラー処理と UX

- 既存ファイルの上書きは禁止  
- テンプレのない種別は `add` 実行時に明示的エラー  
- エラーメッセージは  
  「原因 / パス / 種別 / 修正方法」を含む  
- `eutelo add --help` で種別ごとに詳細ヘルプを表示

---

## 9. 拡張方針

- テンプレ差分比較（Eutelo標準 → プロジェクトの乖離率）  
- purpose の意味的整合チェックとの連携  
- CI からの自動 PR 作成  
- 新しいテンプレ種別の追加  

本機能は  
**「テンプレ存在ドキュメントはすべて add で生成」  
「既存プロジェクトを壊さない」  
「CI が継続的に健全性を保証する」**  
という原則に基づいて設計される。

---