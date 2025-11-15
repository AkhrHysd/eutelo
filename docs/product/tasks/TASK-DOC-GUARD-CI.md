---
id: TASK-DOC-GUARD-CI
type: task
title: Document Guard CI Integration – TDD Task Breakdown
purpose: >
  GitHub Actions で eutelo guard を実行可能にするための
  再利用ワークフローおよび Composite Action を
  Red → Green で実装する具体的タスクを整理する。
parent: PRD-DOC-GUARD-CI
owners: ["@AkhrHysd"]
status: draft
version: 0.1
last_updated: "2025-11-16"
---

# TASK-DOC-GUARD-CI
Document Guard CI Integration – TDD Tasks

---

# 0. 原則

- Red → Green の TDD 実践  
- 1タスク 300行以内  
- 「導入 1 行で使える」を絶対原則  
- まず reusable workflow → その後 composite action  
- 最後に E2E（execa）で GitHub Actions のローカル実行検証

---

# 1. 再利用可能ワークフローの実装

## 1-1 workflow_call のスケルトン作成
- [ ] guard.yml の雛形を作成
- [ ] workflow_call に inputs/secrets を定義（paths / working-directory / endpoint / key）

## 1-2 Node セットアップのテスト
- [ ] actions/setup-node が動作することを確認
- [ ] Node version の input 化（optional）

## 1-3 CLI インストール処理
- [ ] npm install -g @eutelo/cli の E2E テスト

## 1-4 eutelo guard の実行
- [ ] inputs.paths がコマンドラインに適用されるテスト（Red）
- [ ] working-directory 適用のテスト
- [ ] exit code 0/2/3 の扱いを workflow が反映するテスト

## 1-5 secrets の受け渡し
- [ ] endpoint/key を env に安全に展開するテスト
- [ ] ログに secrets を出力しないテスト（重要）

---

# 2. Composite Action の実装

## 2-1 action.yml の雛形
- [ ] inputs（paths / format / working-directory）
- [ ] steps: setup-node → install → guard

## 2-2 guard 実行 E2E
- [ ] execa による local E2E テスト
- [ ] exit code の期待通りの反映

---

# 3. テンプレート workflow の提供

### PR 用テンプレ
- [ ] eutelo-docs 配下の変更のみトリガする設定

### main push 用テンプレ
- [ ] main への merge で整合性チェック

### workflow_dispatch 用
- [ ] 手動起動ワークフロー

---

# 4. Monorepo 対応

## 4-1 working-directory の挙動テスト
- [ ] apps/web/eutelo-docs を対象としたガード実行テスト

## 4-2 path prefix の解決テスト
- [ ] inputs.paths が working-directory に相対で解釈されること

---

# 5. JSON 出力（format=json）

- [ ] inputs.format=json で eutelo guard が JSON を返すテスト
- [ ] GitHub Actions のログに JSON がそのまま出ること

---

# 6. CI E2E テスト（最終統合）

## 6-1 GitHub Actions ローカルランナー（act）で実行確認
- [ ] act を使った guard.yml の実行テスト
- [ ] secrets をダミーで注入して LLM 呼び出しが mock されること

---

# 7. 完了条件（Definition of Done）

- 再利用 workflow が 1 行で呼び出せる  
- Composite Action が normal workflow から使用可能  
- secrets / inputs が BEH の通り動作  
- exit code が CI ステータスに正しく反映  
- Monorepo 対応済み  
- 導入テンプレート（3種）を提供済み  
- ドキュメント（README）が 1 ページで完結  

---