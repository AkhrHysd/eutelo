---
id: BEH-EUTELO-CONFIG-DOC-TYPES
type: behavior
feature: EUTELO-CONFIG-DOC-TYPES
title: Eutelo Config Doc Types 振る舞い仕様
purpose: >
  DocumentType が設定駆動で動作し、config/preset で完全に拡張可能であることを
  観察可能な形で示す振る舞い仕様を定義する。
status: draft
version: 0.1.0
parent: PRD-EUTELO-CONFIG-DOC-TYPES
owners: ["@team-eutelo"]
tags: ["behavior", "doc-type", "extensibility"]
last_updated: "2025-11-22"
---

# BEH-EUTELO-CONFIG-DOC-TYPES

## Background

Eutelo Config Doc Types 機能の振る舞いを定義する。DocumentType が config/preset で完全に拡張可能であり、コアコードの変更なしに新種別を追加できることを観察可能な形で示す。

---

## Scenarios

### 🧩 Scenario DOC-TYPE-S1: Config から解決された DocumentType が CLI で利用できる

```
Given eutelo.config.ts に scaffold エントリが定義されている
  And scaffold に "custom.req" (kind: "req") が含まれている
When "eutelo add req FEATURE-NAME" を実行する
Then CLI は "req" という DocumentType を認識する
  And AddDocumentService が scaffold エントリから "custom.req" を解決する
  And テンプレートからドキュメントが生成される
  And 生成されたファイルの frontmatter に type: "req" が設定されている
```

---

### 🧩 Scenario DOC-TYPE-S2: 未登録の DocumentType に対してエラーを返す

```
Given eutelo.config.ts に "req" という DocumentType が定義されていない
When "eutelo add req FEATURE-NAME" を実行する
Then DocumentTypeNotFoundError がスローされる
  And エラーメッセージに "Document type 'req' not found" が含まれる
  And エラーメッセージに利用可能な DocumentType の一覧が含まれる
  And exit code が 0 以外になる
```

---

### 🧩 Scenario DOC-TYPE-S3: デフォルト preset で既存の DocumentType が動作する

```
Given "@eutelo/preset-default" がインストールされている
  And eutelo.config.ts の presets に "@eutelo/preset-default" が指定されている
When "eutelo add prd FEATURE-NAME" を実行する
Then 既存と同様に PRD ドキュメントが生成される
  And 生成パスが preset-default の定義通りである
  And frontmatter が preset-default の schema に準拠している
```

---

### 🧩 Scenario DOC-TYPE-S4: カスタム DocumentType が Validation で認識される

```
Given eutelo.config.ts に "req" (kind: "req") が定義されている
  And frontmatter.schemas に kind: "req" の schema が定義されている
  And "docs/product/features/AUTH/REQ-AUTH.md" が存在する
  And その frontmatter に type: "req" が設定されている
When "eutelo check" を実行する
Then ValidationService が "req" の schema を適用する
  And frontmatter の検証が正常に実行される
  And エラーが発生しない
```

---

### 🧩 Scenario DOC-TYPE-S5: 未登録 DocumentType のドキュメントに対して警告を出す

```
Given eutelo.config.ts に "req" という DocumentType が定義されていない
  And "docs/product/features/AUTH/REQ-AUTH.md" が存在する
  And その frontmatter に type: "req" が設定されている
When "eutelo check" を実行する
Then ValidationService が警告を出力する
  And "Unknown document type: req" というメッセージが含まれる
  And exit code は 0 のまま（警告のみ）
```

---

### 🧩 Scenario DOC-TYPE-S6: GraphService が Config から解決された DocumentType のみを含める

```
Given eutelo.config.ts に "prd", "beh", "req" が定義されている
  And "docs/product/features/AUTH/PRD-AUTH.md" が存在する
  And "docs/product/features/AUTH/BEH-AUTH.md" が存在する
  And "docs/product/features/AUTH/REQ-AUTH.md" が存在する
When "eutelo graph build" を実行する
Then GraphService が "prd", "beh", "req" の3つの DocumentType を認識する
  And Graph に3つのノードが含まれる
  And 未登録の DocumentType のドキュメントは警告として記録される
```

---

### 🧩 Scenario DOC-TYPE-S7: CLI コマンドが動的に生成される

```
Given eutelo.config.ts に scaffold エントリが定義されている
  And scaffold に "custom.req" (kind: "req") が含まれている
When CLI が起動する
Then "eutelo add req <feature>" コマンドが動的に生成される
  And "eutelo add --help" を実行すると "req" が利用可能な種別として表示される
```

---

### 🧩 Scenario DOC-TYPE-S8: 後方互換性が維持される

```
Given 既存の Dento プロジェクトが存在する
  And "@eutelo/preset-default" がインストールされている
  And eutelo.config.ts が存在しない（デフォルト preset のみ使用）
When "eutelo add prd FEATURE-NAME" を実行する
Then 既存と同様に PRD ドキュメントが生成される
  And コマンド体系が変更されていない
  And 生成パスが既存と同一である
```

---

### 🧩 Scenario DOC-TYPE-S9: Preset とローカル設定のマージで DocumentType が解決される

```
Given "@eutelo/preset-default" がインストールされている
  And preset-default に "prd" (kind: "prd") が定義されている
  And eutelo.config.ts に "custom.req" (kind: "req") が追加定義されている
When "eutelo add prd FEATURE-NAME" を実行する
Then preset-default の "prd" 定義が使用される
When "eutelo add req FEATURE-NAME" を実行する
Then ローカル設定の "req" 定義が使用される
```

---

### 🧩 Scenario DOC-TYPE-S10: scaffoldId で直接指定できる

```
Given eutelo.config.ts に "custom.req" (id: "custom.req", kind: "req") が定義されている
When AddDocumentService.addDocument({ scaffoldId: "custom.req", feature: "AUTH" }) を呼び出す
Then scaffoldId で直接 scaffold エントリを解決する
  And kind による検索は行われない
  And "custom.req" のテンプレートからドキュメントが生成される
```

---

## Expected Outcomes

- Config/Preset 内で宣言されたすべての DocumentType を Add/Scaffold/Lint/Guard が認識し、必要なテンプレート・frontmatter・parent 定義を解決できること
- CLI は config を解釈して新種別の生成コマンドを提供する（または汎用コマンドで type を受け取る）
- Validation/Graph/Guard は、config に未登録の種別に対しては警告またはエラーを出し、登録済みの種別については既存と同じ品質のチェックを実行する
- デフォルト preset を利用する既存ユーザーはコマンド体系の変更なしで利用可能
- 新種別追加に必要な手順を 3 ステップ以内（テンプレ記述・frontmatter schema 記述・config 追加）で完了できる

---

