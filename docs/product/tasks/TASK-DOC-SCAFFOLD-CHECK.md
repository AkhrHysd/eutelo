---
id: TASK-DOC-SCAFFOLD-CHECK
type: task
title: Document Scaffold - check 機能
purpose: >
  ドキュメント構造・命名規則・frontmatter 必須項目を検証する
  `eutelo check` コマンドを構築する。
  CI で利用できる exit code / JSON 出力を備え、
  E2E / Unit / Integration の3層で TDD を行う。
status: draft
version: 0.2
owners: ["@AkhrHysd"]
parent: PRD-DOC-SCAFFOLD
last_updated: "2025-11-14"
---

# TASK-DOC-SCAFFOLD-CHECK  
Document Scaffold - check 機能

---

## 1. Overview

`eutelo check` の目的:

- `eutelo-docs/**` 配下のドキュメントについて
  - frontmatter 必須項目が揃っているか
  - パス・命名規則に違反していないか
  - parent 参照が正しいか
- CI から実行し、構造/命名/必須項目の問題を exit code で検出する

---

## 2. Red（E2E）

### 2.1 正常系（問題なし）

- [ ] 標準どおりに生成されたサンプル `eutelo-docs/` を用意
- [ ] execa で `eutelo check` を実行
- [ ] exitCode = 0
- [ ] stdout に「No issues」「OK」相当の結果要約が出る
- [ ] `--format=json` 指定時、JSON構造が正しく parse できる

### 2.2 必須項目の欠落

- [ ] 任意の PRD から `purpose` を削除（他は正しい状態）
- [ ] `eutelo check` 実行で exitCode = 2（ValidationError 用）
- [ ] JSON出力に「id」「path」「missingField: purpose」が含まれる

### 2.3 命名規則違反

- [ ] `PRD-AUTH.md` を `AUTH-PRD.md` にリネーム
- [ ] `eutelo check` 実行で exitCode = 2
- [ ] 「expected pattern: PRD-{FEATURE}.md」のようなメッセージが含まれる

### 2.4 parent 参照切れ

- [ ] SUB-PRD-LOGIN.md の `parent` を存在しない ID に変更
- [ ] `eutelo check` 実行で exitCode = 2
- [ ] JSON出力に `type: "ParentNotFound"` や類似のエラー種別が含まれる

---

## 3. Red（Unit / Integration）

### 3.1 core/services/ValidationService（Unit）

- [ ] `validateFrontmatter(doc)` が
  - `id`, `purpose`, `parent`, `feature` などの必須項目をチェックする
  - 欠落時に `ValidationError`（詳細情報を含む）を返す
- [ ] `validatePathAndName(docPath, docType)` が
  - DSG で定義された命名規則に適合するか判定
- [ ] `validateParentReferences(docs)` が
  - parent の ID が同一セット内に存在するか検証する

### 3.2 integration: docs スキャン

- [ ] `scanDocs(root)` が `eutelo-docs/**` を走査して  
  Document メタ情報（path, type, frontmatter, parentId）一覧を返す

---

## 4. Green（実装）

### 4.1 CLI（packages/cli）

- [ ] Commander.js で `check` サブコマンドを実装
- [ ] `--format=json` / `--ci` オプションを受け取り core に引き渡す
- [ ] core からの結果（issues: []）を人間向けログ / JSON の両方に整形
- [ ] issues が 0 の場合 exitCode = 0
- [ ] issues がある場合 exitCode = 2

### 4.2 core/services/ValidationService

- [ ] `runChecks(projectRoot)` で以下を行う
  - docs のスキャン
  - frontmatter / path / parent の検証
  - 問題一覧（issues 配列）を返す
- [ ] issues を種類別に分類
  - `missingField`
  - `invalidName`
  - `invalidPath`
  - `parentNotFound`

---

## 5. Refactor

- [ ] エラー種別と exit code を定数として定義（CLI / core で共通利用）
- [ ] JSON レポートの型を TypeScript で定義して整合性を保証
- [ ] Validation ロジックの一部を他コマンド（sync/add）からも再利用可能にする

---

## 6. Definition of Done

- [ ] `eutelo check` が docs 構造の問題を網羅的に検出できる
- [ ] CI から `--format=json` で利用できる
- [ ] exit code によって「OK / 構造問題あり / 実行エラー」が区別できる
- [ ] PRD / DSG / ADR に定義された検証要件を満たす
- [ ] E2E / Unit / Integration の全テストが Green
---