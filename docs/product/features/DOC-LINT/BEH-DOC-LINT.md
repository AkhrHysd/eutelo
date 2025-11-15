---
id: BEH-DOC-LINT
type: beh
feature: doc-lint
title: Document Lint & Static Frontmatter Validation 挙動仕様
purpose: >
  eutelo-docs 内のドキュメント構造および frontmatter を、
  LLM を用いず静的に検証する lint の挙動を定義する。
  この lint は ESLint/Biome/Remark 等の linter 上で利用できることを前提とする。
parent: PRD-DOC-LINT
last_updated: "2025-11-15"
---

# BEH-DOC-LINT  
Document Lint – Static Frontmatter & Structure Validation

---

## Feature: frontmatter とディレクトリ構造の静的ルールを検証する

Eutelo の文書体系に従い、  
frontmatter / ファイル名 / ディレクトリ構造 に関する  
**静的に判断可能な不整合を検出** し lint エラーとして出力する。

LLM は使用しない。

---

## Scenario: frontmatter の必須項目がすべて存在する

```
Given PRD-AUTH.md に frontmatter が存在する
And id, type, feature, purpose が正しく記述されている
When eutelo-doc-lint が実行される
Then lint エラーは発生しない
And exit code は 0
```

---

## Scenario: frontmatter の必須項目が欠落している

```
Given PRD-AUTH.md の frontmatter に purpose が存在しない
When eutelo-doc-lint が実行される
Then "purpose is missing" エラーが表示される
And ファイルパスが表示される
And exit code は 1
```

---

## Scenario: id のパターンが規則に一致しない

```
Given BEH-AUTH.md の id が "WRONG-ID" である
When eutelo-doc-lint が実行される
Then "Invalid id format" エラーが表示される
And exit code は 1
```

---

## Scenario: parent が存在しないドキュメントを参照している

```
Given SUB-PRD-REGISTER.md が parent に "PRD-UNKNOWN" を指定している
And "PRD-UNKNOWN.md" が eutelo-docs に存在しない
When eutelo-doc-lint が実行される
Then "parent not found: PRD-UNKNOWN" エラーが表示される
And exit code は 1
```

---

## Scenario: ファイル名が命名規則に違反している

```
Given ファイル名 PRD-Auth.md が eutelo-docs/product/features/auth/ に存在する
When eutelo-doc-lint が実行される
Then "Invalid filename: PRD-Auth.md" エラーが表示される
And exit code は 1
```

---

## Scenario: ディレクトリ階層が規定と異なる位置にある

```
Given BEH-AUTH.md が eutelo-docs/product/ の直下に存在する
And features/auth/ 以下に置かれていない
When eutelo-doc-lint が実行される
Then "Invalid directory structure" エラーが表示される
And exit code は 1
```

---

## Scenario: frontmatter の unknown フィールドが含まれている

```
Given PRD-AUTH.md の frontmatter に "ownerName" という未知のフィールドが存在する
When eutelo-doc-lint を実行する
Then "Unknown frontmatter field: ownerName" warning が表示される
And exit code は 0
```

---

## Scenario: frontmatter の順序（frontmatter → 本文）が不正

```
Given PRD-AUTH.md の先頭が frontmatter になっていない
When eutelo-doc-lint が実行される
Then "Frontmatter must appear at top of document" エラーが表示される
And exit code は 1
```

---

## Scenario: Markdown の基本構造（H1 が最初の見出しであること）を検証

```
Given PRD-AUTH.md の本文が "## 概要" から始まっている
When eutelo-doc-lint が実行される
Then "Document must start with H1 heading" エラーが表示される
And exit code は 1
```

---

## Scenario: ESLint / Biome / Remark のプラグインとして実行できる

```
Given プロジェクトが ESLint を利用している
And .eslintrc に "plugin:eutelo-docs/recommended" が設定されている
When ESLint が実行される
Then eutelo-doc-lint の静的解析が ESLint 内で実行される
And lint エラーが ESLint のフォーマットで出力される
```

---

## Scenario: CLI モード（eutelo lint）

```
Given ユーザーが "eutelo lint" を実行した
When lint の静的解析が完了する
Then CLI は全てのエラー一覧を表示する
And exit code はエラー数に応じて 0 または 1 となる
```

---

## Scenario: CI モード（--ci）

```
Given CI 環境で "eutelo lint --ci" が実行された
When 静的解析にエラーが存在する
Then exit code は 1 となり CI が失敗する
And エラーメッセージは短く要点のみ表示される
```

---

## Scenario: すべての静的ルールが正しい文書セット

```
Given eutelo-docs 内のすべての PRD/BEH/DSG/ADR が規則に従っている
When eutelo-doc-lint が実行される
Then エラーは発生せず
And exit code は 0
```

---