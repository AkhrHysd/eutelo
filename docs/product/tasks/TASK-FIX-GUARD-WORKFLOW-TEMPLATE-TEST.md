---
id: TASK-FIX-GUARD-WORKFLOW-TEMPLATE-TEST
type: task
feature: GUARD-CI-ASSETS
title: Guard Workflow Template テスト修正
purpose: >
  `guard workflow templates target common triggers and run guard inline` テストが
  失敗している問題を修正する。
status: done
version: 0.1
owners: ["@team-eutelo"]
related: []
due: ""
estimate:
  ideal_days: 1
  realistic_days: 2
  pessimistic_days: 3
last_updated: "2025-12-05"
---

# TASK-FIX-GUARD-WORKFLOW-TEMPLATE-TEST
Guard Workflow Template テスト修正

---

## 問題概要

テスト `guard workflow templates target common triggers and run guard inline` が失敗している。

### エラーメッセージ

```
AssertionError [ERR_ASSERTION]: PR template missing graph build command
    at TestContext.<anonymous> (file:///packages/distribution/tests/guardCiAssets.test.js:72:10)
```

### 原因

テストはPRテンプレートファイルに `npx eutelo graph build` コマンドが含まれていることを期待しているが、テンプレートファイルにそのコマンドが存在しない。

---

## 調査タスク

- [x] `packages/distribution/tests/guardCiAssets.test.js` のテスト内容を確認
- [x] PRテンプレートファイルの場所と内容を確認
- [x] テストの期待値とテンプレートの実態の乖離を分析

---

## 修正タスク

以下のいずれかの方針で修正が必要：

### Option A: テンプレートを修正 ✅ 採用

- [x] PRテンプレート (`guard-pull-request.yml`) に `npx eutelo graph build` コマンドを追加
- [x] Mainテンプレート (`guard-main.yml`) に `npx eutelo graph build` コマンドを追加

### Option B: テストを修正

- [ ] ~~テストの期待値を現在のテンプレートに合わせて修正~~（不採用）

### Option C: 両方を見直し

- [ ] ~~テンプレートとテストの両方を見直し、適切な状態に修正~~（不採用）

---

## Acceptance Criteria

- [x] テスト `guard workflow templates target common triggers and run guard inline` が成功する
- [x] 既存の機能に影響がないことを確認
- [x] 変更内容がドキュメント化されている（このタスクファイルに記録）

---

## Notes

- この問題は `EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE` 機能の実装とは無関係
- テスト実行時に発見された既存のバグ

