---
id: TASK-DOC-SCAFFOLD-ADD
type: task
title: Document Scaffold - add 機能
purpose: >
  テンプレートが存在する全ドキュメント種別について、
  `eutelo add` コマンドで非破壊生成できるようにする。
  Commander.js + core/services + distribution/templates を前提とし、
  E2E / Unit / Integration の3層で TDD を行う。
status: draft
version: 0.2
owners: ["@AkhrHysd"]
parent: PRD-DOC-SCAFFOLD
last_updated: "2025-11-14"
---

# TASK-DOC-SCAFFOLD-ADD  
Document Scaffold - add 機能

---

## 1. Overview

対象となる `add` コマンド:

```
eutelo add prd {FEATURE}
eutelo add beh {FEATURE}
eutelo add sub-prd {FEATURE} {SUB}
eutelo add sub-beh {FEATURE} {SUB}
eutelo add dsg {FEATURE}
eutelo add adr {FEATURE}
eutelo add task {NAME}
eutelo add ops {NAME}
```

目的:

- テンプレから各種ドキュメントを生成（PRD / BEH / SUB-PRD / SUB-BEH / DSG / ADR / TASK / OPS）
- 生成先は常に `eutelo-docs/**`
- 既存ファイルは一切上書きしない
- ADR は連番採番（`ADR-{FEATURE}-0001.md` など）

---

## 2. Red（E2E）

### 2.1 `add prd {FEATURE}` の正常系

- [ ] 空の `eutelo-docs/` 環境で `eutelo add prd AUTH` を実行
- [ ] exitCode = 0
- [ ] `eutelo-docs/product/features/AUTH/PRD-AUTH.md` が生成される
- [ ] frontmatter に `id: PRD-AUTH` が設定されている
- [ ] frontmatter に `feature: auth`（lower/upper は仕様に合わせる）が設定されている

### 2.2 既存 PRD がある場合（上書き禁止）

- [ ] 事前に `PRD-AUTH.md` を作成
- [ ] 再度 `eutelo add prd AUTH` を実行
- [ ] exitCode != 0（`FileAlreadyExists` 相当）
- [ ] ファイル内容が変化していない

### 2.3 BEH / SUB-PRD / SUB-BEH

- [ ] `eutelo add beh AUTH` で `BEH-AUTH.md` が生成される
  - `parent = PRD-AUTH`
- [ ] `eutelo add sub-prd AUTH LOGIN` で `SUB-PRD-LOGIN.md`
  - `parent = PRD-AUTH`
- [ ] `eutelo add sub-beh AUTH LOGIN` で `BEH-AUTH-LOGIN.md`
  - `parent = SUB-PRD-LOGIN`

### 2.4 DSG / ADR / TASK / OPS

- [ ] `eutelo add dsg AUTH` で `DSG-AUTH.md` が生成される
- [ ] `eutelo add adr AUTH` で `ADR-AUTH-0001.md` が生成される
- [ ] 同じFEATUREで再実行すると `ADR-AUTH-0002.md` が生成される
- [ ] `eutelo add task setup-ci` で `TASK-setup-ci.md`
- [ ] `eutelo add ops doc-scaffold-ci` で `OPS-doc-scaffold-ci.md`

### 2.5 テンプレが存在しない種別

- [ ] あえて未知種別（例: `eutelo add contract AUTH`）を使って実行
- [ ] exitCode != 0
- [ ] 「テンプレが存在しない種別」である旨のエラーが表示される

---

## 3. Red（Unit / Integration）

### 3.1 core/services/AddDocumentService（Unit）

- [ ] `resolveOutputPath(type, feature, sub, name)` が DSG に準拠したパスを返す
- [ ] テンプレ存在チェックに失敗すると `TemplateNotFound` を投げる
- [ ] 既存ファイルがある場合は `FileAlreadyExists` を投げる

### 3.2 core/services/TemplateService（Unit）

- [ ] 種別に応じて distribution/templates/** から正しいテンプレを読み込む
- [ ] `{FEATURE}`, `{SUB}`, `{DATE}`, `{ID}`, `{PARENT}` を正しく展開する

### 3.3 ADR の連番採番（Integration）

- [ ] 既存の ADR ファイルを走査して最大番号 + 1 を返すロジックのテスト
- [ ] `0001`, `0002` のようにゼロパディングされること

---

## 4. Green（実装）

### 4.1 CLI（packages/cli）

- [ ] Commander.js で `add` サブコマンドを定義
- [ ] サブサブコマンド（`prd`, `beh`, `sub-prd`, ...）を実装
- [ ] 引数が足りない場合は `InvalidArguments` を core に渡す前にCLI側でエラー終了
- [ ] core の戻り値（または例外）に応じて exit code とメッセージを整形

### 4.2 core/services/AddDocumentService

- [ ] 種別ごとの分岐を internal に集約
- [ ] TemplateService と FileSystemAdapter を利用して非破壊生成
- [ ] ADR のみ連番採番ロジックを噛ませる

---

## 5. Refactor

- [ ] 種別ごとの定義（PRD/BEH/DSG/ADR/TASK/OPS）を型安全な列挙型・マップとして切り出し
- [ ] `resolveOutputPath` / `resolveTemplateType` / `buildFrontmatterDefaults` を関数分割
- [ ] CLI側のボイラープレート削減（共通ヘルパー導入）

---

## 6. Definition of Done

- [ ] `eutelo add` でテンプレが存在する全種類のドキュメントを生成可能
- [ ] 既存ファイルを一切上書きしない
- [ ] BEH の Gherkin シナリオと完全に整合
- [ ] PRD / DSG / ADR の要件を満たす
- [ ] E2E / Unit / Integration の全テストが Green