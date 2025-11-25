---
id: BEH-EUTELO-CONFIG-FRONTMATTER-FIXED-VALUES
type: behavior
feature: EUTELO-CONFIG-FRONTMATTER-FIXED-VALUES
title: Eutelo Config Frontmatter Fixed Values 振る舞い仕様
purpose: >
  フロントマター内の実装上必須な固定値（type と parent）が scaffold 設定から自動的に注入され、
  Graph作成やValidationが正常に動作することを観察可能な形で示す振る舞い仕様を定義する。
status: draft
version: 0.1.0
parent: PRD-EUTELO-CONFIG-FRONTMATTER-FIXED-VALUES
owners: ["@team-eutelo"]
tags: ["behavior", "frontmatter", "scaffold"]
last_updated: "2025-01-27"
---

# BEH-EUTELO-CONFIG-FRONTMATTER-FIXED-VALUES

## Background

Eutelo Config Frontmatter Fixed Values 機能の振る舞いを定義する。フロントマター内の実装上必須な固定値（`type` と `parent`）を scaffold 設定から自動的に注入し、設定ミスを防止し、テンプレートの保守性を向上させることを観察可能な形で示す。

---

## Scenarios

### 🧩 Scenario FIXED-VALUES-S1: scaffold 設定から type が自動注入される

```
Given eutelo.config.ts に scaffold エントリが定義されている
  And scaffold に "document.prd" (kind: "prd") が含まれている
  And frontmatterDefaults.type が "prd" に設定されている
When "eutelo add prd FEATURE-NAME" を実行する
Then AddDocumentService が frontmatterDefaults.type を取得する
  And テンプレートレンダリング時に type がテンプレート変数として利用可能になる
  And 生成されたファイルの frontmatter に type: "prd" が設定されている
  And テンプレート内の固定値記述（type: prd）が上書きされる
```

---

### 🧩 Scenario FIXED-VALUES-S2: scaffold 設定から parent が自動注入される

```
Given eutelo.config.ts に scaffold エントリが定義されている
  And scaffold に "document.beh" (kind: "beh") が含まれている
  And frontmatterDefaults.parent が "PRD-{FEATURE}" に設定されている
  And variables.PARENT が "PRD-{FEATURE}" に設定されている
When "eutelo add beh FEATURE-NAME" を実行する
Then AddDocumentService が frontmatterDefaults.parent を取得する
  And テンプレート変数 {PARENT} が解決される（例: "PRD-AUTH"）
  And テンプレートレンダリング時に parent がテンプレート変数として利用可能になる
  And 生成されたファイルの frontmatter に parent: "PRD-AUTH" が設定されている
  And テンプレート内の固定値記述（parent: PRD-{FEATURE}）が上書きされる
```

---

### 🧩 Scenario FIXED-VALUES-S3: kind と type の整合性チェックが動作する

```
Given eutelo.config.ts に scaffold エントリが定義されている
  And scaffold に "document.beh" (kind: "beh") が含まれている
  And frontmatterDefaults.type が "prd" に設定されている（kind と不一致）
When "eutelo add beh FEATURE-NAME" を実行する
Then ValidationService または AddDocumentService が警告またはエラーを出す
  And エラーメッセージに "kind 'beh' and type 'prd' do not match" が含まれる
  And exit code が 0 以外になる（または警告が表示される）
```

---

### 🧩 Scenario FIXED-VALUES-S4: parent が設定されていない場合にエラーを出す

```
Given eutelo.config.ts に scaffold エントリが定義されている
  And scaffold に "document.beh" (kind: "beh") が含まれている
  And frontmatterDefaults.parent が設定されていない
When "eutelo add beh FEATURE-NAME" を実行する
Then ValidationService または AddDocumentService がエラーを出す
  And エラーメッセージに "parent is required for kind 'beh'. Use '/' for root documents." が含まれる
  And exit code が 0 以外になる
```

---

### 🧩 Scenario FIXED-VALUES-S5: parent が設定されていない場合にエラーを出す（すべてのkindで必須）

```
Given eutelo.config.ts に scaffold エントリが定義されている
  And scaffold に "document.adr" (kind: "adr") が含まれている
  And frontmatterDefaults.parent が設定されていない
When "eutelo add adr FEATURE-NAME" を実行する
Then ValidationService または AddDocumentService がエラーを出す
  And エラーメッセージに "parent is required for kind 'adr'. Use '/' for root documents." が含まれる
  And exit code が 0 以外になる
```

---

### 🧩 Scenario FIXED-VALUES-S6: ルートドキュメントは parent: / を設定する

```
Given eutelo.config.ts に scaffold エントリが定義されている
  And scaffold に "document.prd" (kind: "prd") が含まれている
  And frontmatterDefaults.parent が "/" に設定されている（ルートドキュメント）
When "eutelo add prd FEATURE-NAME" を実行する
Then AddDocumentService が frontmatterDefaults.parent を取得する
  And 生成されたファイルの frontmatter に parent: "/" が設定される
  And ValidationService はエラーを出さない（ルートドキュメントとして正常）
  And GraphService はルートドキュメントとして扱う（orphan node ではない）
```

---

### 🧩 Scenario FIXED-VALUES-S7: テンプレート変数を使用した parent の解決

```
Given eutelo.config.ts に scaffold エントリが定義されている
  And scaffold に "document.beh" (kind: "beh") が含まれている
  And frontmatterDefaults.parent が "{PARENT}" に設定されている
  And variables.PARENT が "PRD-{FEATURE}" に設定されている
When "eutelo add beh AUTH" を実行する
Then AddDocumentService が variables.PARENT を解決する（"PRD-AUTH"）
  And frontmatterDefaults.parent のテンプレート変数 {PARENT} が解決される
  And 生成されたファイルの frontmatter に parent: "PRD-AUTH" が設定されている
```

---

### 🧩 Scenario FIXED-VALUES-S8: Graph作成時に type が欠落しないことを保証する

```
Given eutelo.config.ts に scaffold エントリが定義されている
  And scaffold に "document.prd" (kind: "prd") が含まれている
  And frontmatterDefaults.type が "prd" に設定されている
  And "eutelo-docs/product/features/AUTH/PRD-AUTH.md" が存在する
  And その frontmatter に type: "prd" が設定されている（自動注入された値）
When "eutelo graph build" を実行する
Then GraphService が type を正常に取得する
  And GraphNode.type が "prd" に設定される
  And Graph作成が正常に完了する
```

---

### 🧩 Scenario FIXED-VALUES-S9: Graph作成時に parent が '/' の場合はルートドキュメントとして扱う

```
Given eutelo.config.ts に scaffold エントリが定義されている
  And scaffold に "document.prd" (kind: "prd") が含まれている
  And frontmatterDefaults.parent が "/" に設定されている
  And "eutelo-docs/product/features/AUTH/PRD-AUTH.md" が存在する
  And その frontmatter に parent: "/" が設定されている
When "eutelo graph build" を実行する
Then GraphService が parent: "/" のノードをルートドキュメントとして扱う
  And GraphBuilder.computeIntegrity() が orphan node として記録しない
  And エラーが発生しない
```

---

### 🧩 Scenario FIXED-VALUES-S10: 既存のテンプレート変数との互換性が維持される

```
Given eutelo.config.ts に scaffold エントリが定義されている
  And scaffold に "document.prd" (kind: "prd") が含まれている
  And frontmatterDefaults.type が "prd" に設定されている
  And frontmatterDefaults.parent が "{PARENT}" に設定されている
  And variables.ID が "PRD-{FEATURE}" に設定されている
  And variables.PARENT が "PRINCIPLE-GLOBAL" に設定されている
When "eutelo add prd AUTH" を実行する
Then 既存のテンプレート変数（{ID}, {FEATURE}, {PARENT} など）が引き続き動作する
  And frontmatterDefaults の値が既存の変数と競合しない
  And テンプレートレンダリングが正常に完了する
```

---

### 🧩 Scenario FIXED-VALUES-S11: 後方互換性が維持される（frontmatterDefaults が設定されていない場合）

```
Given eutelo.config.ts に scaffold エントリが定義されている
  And scaffold に "document.prd" (kind: "prd") が含まれている
  And frontmatterDefaults が設定されていない
When "eutelo add prd FEATURE-NAME" を実行する
Then AddDocumentService がエラーを出さない
  And テンプレート内の固定値記述がそのまま使用される
  And ドキュメントが正常に生成される
  And 既存の動作が維持される
```

---

## Expected Outcomes

- scaffold 設定の `frontmatterDefaults.type` と `frontmatterDefaults.parent` が AddDocumentService で自動注入される
- テンプレート内の固定値記述（`type: prd`, `parent: PRD-{FEATURE}` など）が scaffold 設定から注入される値で上書きされる
- `kind` と `type` の不一致が検出され、警告またはエラーが表示される
- すべてのkindに対して `parent` が設定されていない場合にエラーが表示される
- ルートドキュメントは `parent: /` を設定する
- Graph作成時に `type` が欠落しないことを保証する
- `parent` が `/` の場合はルートドキュメントとして扱い、orphan node ではない
- 既存のテンプレート変数（`{ID}`, `{FEATURE}`, `{PARENT}` など）との互換性が維持される
- `frontmatterDefaults` が設定されていない場合でも既存の動作が維持される（後方互換性）

---

