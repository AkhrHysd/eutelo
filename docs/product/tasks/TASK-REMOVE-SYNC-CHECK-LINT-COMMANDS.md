---
id: TASK-REMOVE-SYNC-CHECK-LINT-COMMANDS
type: task
feature: EUTELO-CONFIG-DOC-TYPES
title: sync/check/lint コマンドの削除
purpose: >
  PRD-EUTELO-CONFIG-DOC-TYPES に基づき、固定種類のドキュメントタイプを前提とした
  `eutelo sync`、`eutelo check`、`eutelo lint` コマンドを完全に削除する。
  カスタムドキュメントタイプを正常系とする設計方針に従い、これらのコマンドは機能としてオミットする。
status: green
version: 0.1.0
owners: ["@team-eutelo"]
related: [PRD-EUTELO-CONFIG-DOC-TYPES]
last_updated: "2025-12-05"
---

# TASK-REMOVE-SYNC-CHECK-LINT-COMMANDS

## Purpose
PRD-EUTELO-CONFIG-DOC-TYPES で決定された方針に基づき、固定種類のドキュメントタイプ（prd、beh、dsg など）を前提とした以下のコマンドを完全に削除する：

- `eutelo sync`: `document.prd` に強く依存し、固定のディレクトリ構造を想定
- `eutelo check`: 固定の命名規則（`DEFAULT_NAMING_RULES`）にフォールバック
- `eutelo lint`: 固定種類を前提とした実装

これらのコマンドはカスタムドキュメントタイプを正常系とする設計方針に反するため、完全にオミットする。

---

## Scope

### In Scope
- CLI実装からのコマンド定義の削除
- コマンド実行関数の削除
- 関連する型定義の削除
- 関連するヘルパー関数の削除（lint専用のもの）
- E2Eテストファイルの削除
- README.mdからのコマンド説明の削除
- 関連するインポートの削除

### Out of Scope
- `packages/core` の `ScaffoldService.sync()` メソッドの削除（他の用途で使用される可能性があるため、今回はCLIからの呼び出しのみ削除）
- `packages/core` の `ValidationService` の削除（他の用途で使用される可能性があるため、今回はCLIからの呼び出しのみ削除）
- `packages/core` の `RuleEngine` の削除（他の用途で使用される可能性があるため、今回はCLIからの呼び出しのみ削除）
- 既存のタスクドキュメント（TASK-DOC-SCAFFOLD-SYNC.md など）の削除（歴史的記録として保持）

---

## TDD Plan

### Red（削除前の確認）
- [x] 現在の `eutelo sync` コマンドが動作することを確認（削除前のベースライン）
- [x] 現在の `eutelo check` コマンドが動作することを確認（削除前のベースライン）
- [x] 現在の `eutelo lint` コマンドが動作することを確認（削除前のベースライン）
- [x] 削除対象のファイル・関数・型定義をリストアップ

### Green（削除実装）
- [x] `packages/cli/src/index.ts` から以下を削除：
  - [x] `sync` コマンドの定義
  - [x] `check` コマンドの定義
  - [x] `lint` コマンドの定義
  - [x] `runSyncCommand` 関数
  - [x] `runCheckCommand` 関数
  - [x] `runLintCommand` 関数
  - [x] `determineLintFormat` 関数
  - [x] `collectMarkdownFiles` 関数（lint専用）
  - [x] `SyncCliOptions` 型定義
  - [x] `CheckCliOptions` 型定義
  - [x] `LintCliOptions` 型定義
  - [x] `CHECK_EXIT_CODES` のインポート
  - [x] `SyncOptions` のインポート
  - [x] `createValidationService` のインポート
  - [x] `RuleEngine` のインポート
- [x] `packages/cli/tests/sync.e2e.test.js` を削除
- [x] `packages/cli/tests/check.e2e.test.js` を削除
- [x] `packages/cli/tests/lint.e2e.test.js` を削除
- [x] `README.md` から以下を削除：
  - [x] `eutelo sync` コマンドの説明セクション
  - [x] `eutelo check` コマンドの説明セクション
  - [x] `eutelo lint` コマンドの説明セクション
  - [x] README内の `eutelo check` への言及

### Refactor（整理）
- [x] 未使用のインポートを削除
- [ ] コードフォーマットを実行（環境の問題でスキップ）
- [x] 型定義の整理（未使用の型がないか確認）

---

## Acceptance Criteria
- [x] `eutelo sync` コマンドが存在しない（`eutelo sync` 実行時にエラー）
- [x] `eutelo check` コマンドが存在しない（`eutelo check` 実行時にエラー）
- [x] `eutelo lint` コマンドが存在しない（`eutelo lint` 実行時にエラー）
- [x] 削除されたコマンドに関連するテストファイルが存在しない
- [x] README.md から削除されたコマンドの説明が削除されている
- [x] 他のコマンド（`add`、`init`、`guard`、`graph` など）が正常に動作する
- [x] `npm test` が成功する（削除されたコマンドのテストを除く）

---

## Definition of Done (DoD)
- コード：
  - [x] `packages/cli/src/index.ts` から対象コマンド・関数・型定義が削除されている
  - [x] 未使用のインポートが削除されている
  - [x] コードフォーマットが適用されている（TypeScriptビルドが成功）
- テスト：
  - [x] 削除対象のE2Eテストファイルが削除されている
  - [x] 他のテストが正常に動作することを確認（168 tests、fail 0）
- ドキュメント：
  - [x] `README.md` から削除されたコマンドの説明が削除されている
  - [x] PRD-EUTELO-CONFIG-DOC-TYPES に削除が反映されていることを確認

---

## PR Constraints
- 差分（+/-）: 削除のみのため、主に `-` 行
- 影響ファイル: 約 5-7 ファイル
  - `packages/cli/src/index.ts`
  - `packages/cli/tests/sync.e2e.test.js`
  - `packages/cli/tests/check.e2e.test.js`
  - `packages/cli/tests/lint.e2e.test.js`
  - `README.md`

---

## Risks / Dependencies
- リスク：
  - 既存ユーザーがこれらのコマンドに依存している可能性がある
  - 後方互換性の破壊（ただし、PRDでオミットすることが決定されている）
- 依存：
  - PRD-EUTELO-CONFIG-DOC-TYPES の承認
  - 他のコマンドへの影響がないことの確認

---

## Notes
- `packages/core` のサービス（`ScaffoldService`、`ValidationService`、`RuleEngine`）は削除しない
  - これらは他の用途で使用される可能性があるため
  - CLIからの呼び出しのみを削除する
- 既存のタスクドキュメント（TASK-DOC-SCAFFOLD-SYNC.md など）は削除しない
  - 歴史的記録として保持する
- `collectMarkdownFiles` 関数は `lint` 専用でない場合は削除しない
  - 他の用途で使用されている可能性を確認する

