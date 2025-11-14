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
version: 0.2
parent: PRD-DOC-SCAFFOLD
owners: ["@AkhrHysd"]
last_updated: "2025-11-14"
---

# DSG-DOC-SCAFFOLD  
Document Scaffold & CI Integration 設計ガイド（ADR-0001 反映）

---

## 1. 概要

本設計ガイドは **PRD-DOC-SCAFFOLD** と **ADR-DOC-SCAFFOLD-0001（開発基盤選定）**  
の内容に基づき、Document Scaffold 機能の **アーキテクチャ・責務分担・フロー設計** を定義する。

主な責務:

- Eutelo 標準ドキュメント構造の **初期生成 (`eutelo init`)**
- 不足テンプレートの **非破壊同期 (`eutelo sync`)**
- テンプレートからの **個別ドキュメント生成 (`eutelo add …`)**
- CI 用の **構造チェック (`eutelo check`)**
- すべてをテストファースト（TDD）で実装可能な分割構造

対象となるドキュメント種別（テンプレートが存在するもののみ）:

- PRD / SUB-PRD  
- BEH / SUB-BEH  
- DSG  
- ADR  
- TASK  
- OPS  

---

## 2. アーキテクチャ全体像（ADRの決定反映）

### 2.1 パッケージ構成（monorepo）

```
packages/
  cli/             # Commander.js ベースの薄い CLI。I/O のみ担当。
  core/            # ScaffoldService / TemplateService / ValidationService など純粋ロジック
  distribution/    # templates/（唯一のテンプレートソース、静的ファイル）
```

目的:

- CLI を薄く保ち、ほぼ全ロジックを core に集約して TDD を容易化
- distribution パッケージをテンプレート専用にして責務を分離
- 将来 Rust/Bun CLI へ移行しても core は使いまわせる構造

---

### 2.2 ランタイム

- **Node.js 18+**  
- ESM ベース構成  
- 理由は ADR に準拠（CI 互換性 / CLI 実行安定性 / npm 配布容易性）

---

### 2.3 CLI 基盤

- **Commander.js**  
- サブコマンド完全分離方式

```
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

CLI は I/O（ログ・exit code・引数パース）のみ担当し、  
実処理は 100% core 層へ委譲する。

---

### 2.4 Template 管理

テンプレートは **distribution パッケージ**に固定で格納する。

```
packages/distribution/templates/
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

CLI は以下順序でテンプレ解決：

1. `<pkgRoot>/templates/**`（distribution）
2. （将来）`<projectRoot>/eutelo.templates/**`（ローカル上書き）

※ 現段階では ①のみに対応。

---

### 2.5 Validation 基盤

ValidationService は次を扱う:

- frontmatter の必須項目  
  - `id` / `feature` / `purpose` / `parent`
- 命名規則（PRD-{FEATURE}.md / SUB-PRD-{SUB}.md / BEH-{FEATURE}.md 等）
- パス規則（必ず `eutelo-docs/**` 配下）
- parent の参照整合
- exit code 専用のエラー分類

---

### 2.6 テスト構成（TDD）

ADR の決定に従い、3層構造でテストを行う。

```
Unit            -> core/services/*.ts を Vitest でテスト
Integration     -> fs操作を含む core + infrastructure の統合テスト
E2E             -> execa で実際の CLI を起動して検証
```

E2E の目的：

- exit code  
- stdout / stderr  
- 実際の生成パス  
- commander のパース検証  
- 非破壊保証  

を CLI の “実物” に対して確認するため。

---

## 3. コンポーネント構造

### 3.1 CLI 層（packages/cli）

責務:

- Commander.js によるサブコマンド定義
- コマンド引数のバリデーション
- core の呼び出し
- exit code の変換
- ログ整形
- CI向け `--format=json` 出力

**CLI はロジックを書かない。**

---

### 3.2 Core 層（packages/core）

#### ScaffoldService
- `eutelo init`  
- `eutelo sync`  
- ディレクトリ構造の生成・判定

#### TemplateService
- テンプレファイルの読み取り  
- 展開（{FEATURE} / {SUB} / {DATE} / {ID} / {PARENT}）

#### AddDocumentService
- `add prd`  
- `add beh`  
- `add` 系の全分岐  
- 出力パス計算・非破壊書き込み

#### ValidationService
- パス規則・命名規則・frontmatter の静的検証

#### DryRunService
- 実ファイルを作らず差分を返す

---

### 3.3 Infrastructure 層

#### FileSystemAdapter
- `exists(path)`  
- `writeIfNotExists(path, content)`  
- `mkdirp(path)`  

#### TemplateRepository
- `<pkgRoot>/templates/**` の読み込み
- いずれはローカルテンプレ上書きをサポート

---

## 4. テンプレート設計

### 4.1 テンプレート配置ルール（確定版）

```
<pkgRoot>/templates/
  features/
  design/
  adr/
  tasks/
  ops/
```

CLI はすべて distribution 経由で参照する。

---

### 4.2 テンプレート変数

必須サポート:

- `{FEATURE}`
- `{SUB}`
- `{DATE}`
- `{ID}`
- `{PARENT}`
- `{VERSION}`
- `{OWNERS}`

変数展開は TemplateService が集中管理。

---

## 5. 生成されるドキュメント構造（出力側）

CLI が生成するディレクトリは常に以下。

```
eutelo-docs/
  product/features/{FEATURE}/
  architecture/design/{FEATURE}/
  architecture/adr/{FEATURE}/
  tasks/
  ops/
```

すべての add/init/sync はこの構造を破壊しない。

---

## 6. 主要フロー

### 6.1 init

- ディレクトリ作成  
- 非破壊チェック  
- 既存プロジェクトを壊さないことを最優先  
- dry-run 対応

### 6.2 sync

- 期待構造の推定  
- 不足テンプレ（存在しないファイル）だけ生成  
- `--check-only`  
  - exit: 1  
  - 生成しない

### 6.3 add

- 種別ごとにテンプレロード  
- 展開 → パス決定 → 非破壊書き込み  
- 既存ファイルは必ずエラー  
- ADR のみ連番採番

### 6.4 check

- ValidationService にて構造検証  
- JSONモードで CI 連携  
- exit code 0/1/2 を厳密管理

---

## 7. エラー設計

core が標準化した例外を投げる：

- TemplateNotFound  
- FileAlreadyExists  
- InvalidArguments  
- ValidationError  

CLI がこれを受けて exit code に変換し、  
原因・対象パス・修正方針を表示する。

---

## 8. 今後の拡張（ADR整合）

未来の追加機能:

- `eutelo.config.json` によるディレクトリカスタマイズ
- テンプレ差分比較
- ローカルテンプレ上書き
- PR 自動生成（VcsAdapter）
- Rust/Bun CLI への移植

---

## 9. 完了条件（Definition of Done）

- packages が cli / core / distribution に分割されている  
- Commander.js による CLI が構築されている  
- core が純粋ロジックとして TDD 可能  
- distribution がテンプレ唯一のソース  
- Unit / Integration / E2E の三層テストが実装済み  
- すべてのコマンドが BEH のシナリオと整合  
- PRD / ADR に定義された要件を満たす

---