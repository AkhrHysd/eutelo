---
id: BEH-DOC-GUARD-CI
type: beh
feature: doc-guard-ci
title: Document Guard CI Integration 挙動仕様
purpose: >
  GitHub Actions 上で eutelo guard が簡単に実行され、
  ドキュメント整合性のチェック結果を CI ステータスとして返せるようにする
  挙動を定義する。
parent: PRD-DOC-GUARD-CI
last_updated: "2025-11-16"
---

# BEH-DOC-GUARD-CI
Document Guard CI Integration – Gherkin Specification

---

## Feature: GitHub Actions で eutelo guard を安全かつ簡単に実行する

---

## Scenario: 再利用可能ワークフローを呼び出すだけで doc-guard が動作する

```
Given ユーザーのリポジトリに eutelo-docs/ が存在する
And ユーザーが CI で文書整合性のチェックをしたい
When ユーザーが workflow に
  "uses: eutelo/eutelo-ci/.github/workflows/guard.yml@v1"
  を追加する
Then GitHub Actions は eutelo guard を自動実行する
And exit code に応じて CI を success/fail させる
```

---

## Scenario: secrets と inputs により API やパスを柔軟に指定できる

```
Given ユーザーが EUTELO_GUARD_API_KEY を secrets に登録している
And API endpoint も secrets に登録している
When guard ワークフローが実行される
Then eutelo guard は secrets を使用して LLM に接続する
And 対象パスは inputs.paths の値で上書きできる
```

---

## Scenario: PR 時に eutelo-docs/** が変更された場合のみ doc-guard を実行する

```
Given PR で eutelo-docs 配下のファイルが変更されている
When workflow が triggers.paths に "eutelo-docs/**" を指定している
Then GitHub Actions は doc-guard を実行する
```

---

## Scenario: Monorepo でサブディレクトリを working-directory として指定できる

```
Given プロジェクトが monorepo 構成で docs が apps/web/eutelo-docs に存在する
When inputs.working-directory に "apps/web" を指定して guard を実行する
Then eutelo guard は apps/web/eutelo-docs 以下を対象として評価する
```

---

## Scenario: guard の結果が WARNING の場合は CI を fail にしない

```
Given eutelo guard が "warning" を検出した
When --fail-on-error はデフォルト設定である
Then CI は success のまま完了する
```

---

## Scenario: guard の結果が ERROR / FATAL の場合は CI を fail にする

```
Given eutelo guard が error もしくは fatal レベルの issue を検出した
When CI 環境で実行された
Then exit code は 2 または 3 を返し
And CI は fail となる
```

---

## Scenario: workflow_dispatch による手動実行が可能

```
Given ユーザーが手動で guard を実行したい
When workflow_dispatch を使った guard workflow を起動する
Then eutelo guard は指定されたパスと secrets で実行される
And 結果は Actions のログで確認できる
```

---

## Scenario: JSON 形式で guard 結果を取得できる

```
Given ユーザーが format=json を input に指定している
When guard workflow が実行される
Then 結果は JSON としてログに出力される
And downstream workflow でパース可能である
```

---