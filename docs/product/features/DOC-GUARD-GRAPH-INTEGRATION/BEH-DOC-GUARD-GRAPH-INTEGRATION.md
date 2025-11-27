---
id: BEH-DOC-GUARD-GRAPH-INTEGRATION
type: beh
feature: doc-guard-graph-integration
title: Guard × Graph 連携 - 関連ドキュメント自動探索 挙動仕様
purpose: >
  eutelo guard コマンドが graph の内部機能を活用して
  関連ドキュメントを自動探索・収集する際の振る舞いを定義する。
parent: PRD-DOC-GUARD-GRAPH-INTEGRATION
last_updated: "2025-11-27"
---

# BEH-DOC-GUARD-GRAPH-INTEGRATION

Guard × Graph 連携 - 関連ドキュメント自動探索 挙動仕様（Gherkin）

---

## Feature: guard コマンドによる関連ドキュメント自動収集

guard コマンドは、指定されたドキュメントの parent / related 関係を
graph 機能を使って自動的にたどり、関連ドキュメントを収集する。

これにより、単一ドキュメント指定でも複数ドキュメント間の整合性チェックが有効に機能する。

---

## Scenario: 単一ドキュメント指定で parent を自動収集する

```gherkin
Given PRD-AUTH.md の parent が "PRD-CORE" である
  And PRD-CORE.md がプロジェクト内に存在する
When ユーザーが "eutelo guard docs/PRD-AUTH.md" を実行する
Then guard は PRD-AUTH.md の parent (PRD-CORE) を自動的に取得する
  And LLM には PRD-AUTH.md と PRD-CORE.md の両方が送信される
  And CLI は "Found 1 related document(s)" と表示する
  And exit code は整合性チェック結果に応じて 0 または 2 となる
```

---

## Scenario: 単一ドキュメント指定で related を自動収集する

```gherkin
Given PRD-AUTH.md が存在する
  And 同じ feature に BEH-AUTH.md と DSG-AUTH.md が存在する
  And それらは PRD-AUTH.md と related 関係にある
When ユーザーが "eutelo guard docs/PRD-AUTH.md" を実行する
Then guard は BEH-AUTH.md と DSG-AUTH.md を自動的に取得する
  And LLM には 3 つのドキュメントが送信される
  And CLI は "Found 2 related document(s)" と表示する
```

---

## Scenario: depth=1 で直近の関連のみ収集する（デフォルト）

```gherkin
Given SUB-PRD-AUTH-OAUTH.md の parent が "PRD-AUTH" である
  And PRD-AUTH.md の parent が "PRD-CORE" である
When ユーザーが "eutelo guard docs/SUB-PRD-AUTH-OAUTH.md" を実行する
Then guard は PRD-AUTH.md のみを収集する（depth=1 がデフォルト）
  And PRD-CORE.md は収集されない（2 hop 以上離れているため）
  And CLI は "Found 1 related document(s)" と表示する
```

---

## Scenario: depth=2 で 2 ホップまでの関連を収集する

```gherkin
Given SUB-PRD-AUTH-OAUTH.md → PRD-AUTH.md → PRD-CORE.md の parent 関係がある
When ユーザーが "eutelo guard docs/SUB-PRD-AUTH-OAUTH.md --depth=2" を実行する
Then guard は PRD-AUTH.md と PRD-CORE.md の両方を収集する
  And CLI は "Found 2 related document(s)" と表示する
```

---

## Scenario: --all オプションで全先祖・全関連を収集する

```gherkin
Given 深い階層のドキュメント構造が存在する
  And SUB-BEH-AUTH-OAUTH-GOOGLE.md → ... → PRD-CORE.md まで 5 hop の関係がある
When ユーザーが "eutelo guard docs/SUB-BEH-AUTH-OAUTH-GOOGLE.md --all" を実行する
Then guard は 5 hop すべての関連ドキュメントを収集する
  And CLI は "Found N related document(s) (depth: unlimited)" と表示する
```

---

## Scenario: --no-related オプションで自動収集を無効化する

```gherkin
Given PRD-AUTH.md に複数の関連ドキュメントが存在する
When ユーザーが "eutelo guard docs/PRD-AUTH.md --no-related" を実行する
Then guard は関連ドキュメントを収集しない
  And LLM には PRD-AUTH.md のみが送信される
  And CLI は関連収集のメッセージを表示しない
```

---

## Scenario: 関連ドキュメントが見つからない場合

```gherkin
Given ORPHAN-DOC.md の parent が "/" （ルート）である
  And related 関係のドキュメントが存在しない
When ユーザーが "eutelo guard docs/ORPHAN-DOC.md" を実行する
Then guard は警告を出力する
  And "No related documents found. Single document check may be limited." と表示される
  And 指定されたドキュメントのみでチェックを続行する
  And exit code は整合性チェック結果に応じて決定される
```

---

## Scenario: parent が存在しないドキュメント ID を参照している

```gherkin
Given PRD-AUTH.md の parent が "PRD-NOTFOUND" である
  And PRD-NOTFOUND は存在しないドキュメント ID である
When ユーザーが "eutelo guard docs/PRD-AUTH.md" を実行する
Then guard は警告を出力する
  And "Parent document not found: PRD-NOTFOUND" と表示される
  And 他の関連ドキュメントの収集は続行される
  And exit code は整合性チェック結果に応じて決定される
```

---

## Scenario: 循環参照が存在する場合

```gherkin
Given DOC-A.md の related に "DOC-B" が含まれる
  And DOC-B.md の related に "DOC-A" が含まれる
When ユーザーが "eutelo guard docs/DOC-A.md --depth=3" を実行する
Then guard は循環を検出して無限ループを回避する
  And DOC-A.md と DOC-B.md は 1 回ずつのみ収集される
  And "Circular reference detected" の警告が表示される
```

---

## Scenario: 収集上限に達した場合

```gherkin
Given 100 を超える関連ドキュメントが存在する
When ユーザーが "eutelo guard docs/ROOT-DOC.md --all" を実行する
Then guard は 100 ドキュメントで収集を停止する
  And "Related document limit reached (100). Some documents may be omitted." と警告を表示する
  And 収集された 100 ドキュメントでチェックを続行する
```

---

## Scenario: JSON 出力で収集されたドキュメント一覧を確認する

```gherkin
Given PRD-AUTH.md に 3 つの関連ドキュメントが存在する
When ユーザーが "eutelo guard docs/PRD-AUTH.md --format=json" を実行する
Then JSON 出力に "relatedDocuments" フィールドが含まれる
  And 各関連ドキュメントの id / path / hop / via 情報が含まれる
```

**期待される JSON 構造:**

```json
{
  "origin": {
    "id": "PRD-AUTH",
    "path": "docs/product/features/AUTH/PRD-AUTH.md"
  },
  "relatedDocuments": [
    {
      "id": "PRD-CORE",
      "path": "docs/product/features/CORE/PRD-CORE.md",
      "hop": 1,
      "via": "parent",
      "direction": "upstream"
    },
    {
      "id": "BEH-AUTH",
      "path": "docs/product/features/AUTH/BEH-AUTH.md",
      "hop": 1,
      "via": "related",
      "direction": "downstream"
    }
  ],
  "summary": "Analyzed 4 document(s). Found 2 issue(s).",
  "issues": [...],
  "warnings": [...],
  "suggestions": [...]
}
```

---

## Scenario: CI 環境での高速チェック

```gherkin
Given CI パイプラインで guard が実行される
  And パフォーマンスが重要視される
When ユーザーが "eutelo guard docs/PRD-AUTH.md --depth=1 --ci" を実行する
Then guard は直近の関連のみ収集する（depth=1）
  And 関連ドキュメント探索は 500ms 以内に完了する
  And CI 向けの簡潔な出力形式で結果を表示する
```

---

## Feature: graph related コマンドによる関連ドキュメント探索

guard 実行前に関連ドキュメントを確認するための standalone コマンドを提供する。

---

## Scenario: graph related で関連ドキュメント一覧を取得する

```gherkin
Given PRD-AUTH.md に parent と related の関連が存在する
When ユーザーが "eutelo graph related docs/PRD-AUTH.md" を実行する
Then CLI は関連ドキュメント一覧をテーブル形式で表示する
  And 各ドキュメントの ID / hop / 関係種別 / 方向が表示される
  And exit code は 0 である
```

**期待される出力:**

```
Related documents for PRD-AUTH:

  Direction  Hop  Via      ID           Path
  ─────────  ───  ───────  ───────────  ────────────────────────────
  ↑ upstream   1  parent   PRD-CORE     docs/.../PRD-CORE.md
  ↓ downstream 1  related  BEH-AUTH     docs/.../BEH-AUTH.md
  ↓ downstream 1  related  DSG-AUTH     docs/.../DSG-AUTH.md

Total: 3 related document(s)
```

---

## Scenario: graph related で direction を指定する

```gherkin
Given PRD-AUTH.md に upstream / downstream の両方の関連がある
When ユーザーが "eutelo graph related docs/PRD-AUTH.md --direction=upstream" を実行する
Then CLI は upstream（parent 方向）の関連のみを表示する
  And downstream の関連は表示されない
```

---

## Scenario: graph related で JSON 出力する

```gherkin
Given PRD-AUTH.md に関連ドキュメントが存在する
When ユーザーが "eutelo graph related docs/PRD-AUTH.md --format=json" を実行する
Then CLI は JSON 形式で関連ドキュメント情報を出力する
  And JSON は parse 可能な構造である
```

---

## Scenario: 存在しないドキュメントを指定した場合

```gherkin
Given NOTFOUND.md は存在しないファイルである
When ユーザーが "eutelo graph related docs/NOTFOUND.md" を実行する
Then CLI は "Document not found: docs/NOTFOUND.md" とエラーを表示する
  And exit code は 1 である
```

---

## Expected Outcomes

- 単一ドキュメント指定でも、関連ドキュメントが自動収集され整合性チェックが有効に機能する
- depth オプションで探索範囲を柔軟に制御できる
- graph related コマンドで事前に関連ドキュメントを確認できる
- 循環参照・収集上限などのエッジケースが適切にハンドリングされる

---

