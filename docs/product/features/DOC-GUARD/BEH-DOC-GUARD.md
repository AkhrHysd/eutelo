---
id: BEH-DOC-GUARD
type: beh
feature: doc-guard
title: Document Guard & LLM Consistency Check 挙動仕様
purpose: >
  eutelo-docs 内のドキュメント内容が Eutelo の原則・purpose・parent 体系に
  整合しているかを LLM を用いて検証するふるまいを定義する。
  guard は「与えられた文書セット」を対象とし、文書選定は呼び出し元の責務とする。
parent: PRD-DOC-GUARD
last_updated: "2025-11-14"
---

# BEH-DOC-GUARD  
Document Guard & LLM Consistency Check - 挙動仕様（Gherkin）

---

## Feature: LLM によるドキュメント整合性チェック

doc-guard は、CLI または CI から指定された eutelo-docs 内の文書について  
LLM を利用した内容整合性チェックを行う。

文書の **選定**（どれをチェック対象とするか）は guard の責務ではなく、  
CI・ユーザー側がコマンドラインで指定する。

---

## Scenario: 入力された文書が空の場合は即成功する

```
Given guard コマンドに渡された対象文書リストが空である
When ユーザーが "eutelo guard" を実行する
Then LLM には何も送信されない
And CLI は "No documents to check" と表示する
And exit code は 0 である
```

---

## Scenario: 指定された文書セットに対して整合性チェックを行う（正常系）

```
Given PRD/BEH/DSG/ADR が正しく整合しているプロジェクトがある
And guard コマンドにそれらの文書パスが渡されている
And ユーザーは API endpoint と API-KEY を設定済みである
When "eutelo guard {FILES...}" を実行する
Then guard は指定された文書を読み込む
And LLM に文書の内容・関係・purpose を送信する
And LLM の応答は "No issues" である
And exit code は 0 である
```

---

## Scenario: PRD と BEH の purpose が矛盾している

```
Given PRD-AUTH.md の purpose が "認証を無効化する" と記述されている
And BEH-AUTH.md は "認証成功の挙動" を定義している
And guard に両ファイルが入力される
When "eutelo guard PRD-AUTH.md BEH-AUTH.md" を実行する
Then LLM は purpose の整合性エラーを指摘する
And CLI は "purpose conflict" を含むレポートを表示する
And exit code は 2 である
```

---

## Scenario: BEH が PRD の scope を満たしていない（不足）

```
Given PRD-AUTH.md が "新規登録を含む" と記述されている
And BEH-AUTH.md のシナリオに新規登録が含まれていない
And guard に両ファイルが渡される
When "eutelo guard PRD-AUTH.md BEH-AUTH.md" を実行する
Then LLM は "scope不足" を指摘する
And CLI は詳細メッセージを表示する
And exit code は 2 である
```

---

## Scenario: ADR と PRD が矛盾している

```
Given ADR-AUTH-0001.md が "AUTH機能を削除する" と決定している
And PRD-AUTH.md には "AUTHを提供する" と記述されている
And guard に両ファイルが渡される
When "eutelo guard ADR-AUTH-0001.md PRD-AUTH.md" を実行する
Then LLM は "ADR と PRD の矛盾" を指摘する
And CLI は "ADR conflict detected" を表示する
And exit code は 2 である
```

---

## Scenario: parent の参照が不正である

```
Given SUB-PRD-LOGIN.md の parent が "PRD-NOTFOUND" になっている
And guard に SUB-PRD-LOGIN.md が渡される
When "eutelo guard SUB-PRD-LOGIN.md" を実行する
Then LLM は parent の参照不整合を指摘する
And exit code は 2 である
```

---

## Scenario: LLM 接続に失敗する（API-KEY 未設定）

```
Given API-KEY が環境変数に設定されていない
When "eutelo guard PRD-AUTH.md" を実行する
Then guard は接続前に "API key missing" のエラーを表示する
And exit code は 3 である
```

---

## Scenario: LLM 接続に失敗する（HTTPエラー）

```
Given API endpoint が HTTP 500 を返す
When "eutelo guard PRD-AUTH.md" を実行する
Then guard は "LLM request failed" と表示する
And exit code は 3 である
```

---

## Scenario: CI で fail-on-error モードを使用する

```
Given purpose に矛盾がある文書が guard に渡されている
And ユーザーは "--fail-on-error" を指定している
When "eutelo guard --fail-on-error PRD-AUTH.md BEH-AUTH.md" を実行する
Then exit code は 2 となる
And CLI は "errors found" を表示する
```

---

## Scenario: CI で warn-only モードを使用する

```
Given 軽微な不整合（scope 不足など）が guard に渡されている
And ユーザーは "--warn-only" を使用している
When "eutelo guard --warn-only PRD-AUTH.md BEH-AUTH.md" を実行する
Then exit code は 0 である
And CLI は "warnings" として内容を表示する
```

---

## Scenario: JSON 出力

```
Given guard に複数の文書が渡されている
When "eutelo guard --format=json {FILES...}" を実行する
Then CLI は解析結果を JSON 形式で出力する
And "issues" ブロックに LLM が指摘した内容が含まれる
And exit code は検出された内容に応じて 0 または 2 となる
```

---

## Scenario: LLM の改善提案をレビューとして出力する

```
Given LLM がある文書に対し改善提案を返した
When guard を実行する
Then CLI は "Review Suggestions:" ブロックに提案を表示する
And exit code は 0 または 1（warn）となる
```

---

## Scenario: 入力された文書の読み込みに失敗する

```
Given guard に渡されたファイルのうち、1つが存在しないパスである
When "eutelo guard NOTFOUND.md" を実行する
Then guard は "File not found" のエラーを表示する
And exit code は 3 である
```

---