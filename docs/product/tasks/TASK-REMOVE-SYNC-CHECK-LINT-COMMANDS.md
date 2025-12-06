---
id: TASK-REMOVE-SYNC-CHECK-LINT-COMMANDS
type: task
feature: EUTELO-CONFIG-DOC-TYPES
title: sync/check/lint コマンドの削除
purpose: >
  PRD-EUTELO-CONFIG-DOC-TYPES に基づき、固定種類のドキュメントタイプを前提とした
  `eutelo sync`、`eutelo check`、`eutelo lint` コマンドを完全に削除する。
  カスタムドキュメントタイプを正常系とする設計方針に従い、これらのコマンドは機能としてオミットする。
status: red
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
- [ ] 現在の `eutelo sync` コマンドが動作することを確認（削除前のベースライン）
- [ ] 現在の `eutelo check` コマンドが動作することを確認（削除前のベースライン）
- [ ] 現在の `eutelo lint` コマンドが動作することを確認（削除前のベースライン）
- [ ] 削除対象のファイル・関数・型定義をリストアップ

### Green（削除実装）
- [ ] `packages/cli/src/index.ts` から以下を削除：
  - [ ] `sync` コマンドの定義（line 1114-1135付近）
  - [ ] `check` コマンドの定義（line 1137-1161付近）
  - [ ] `lint` コマンドの定義（line 917-936付近）
  - [ ] `runSyncCommand` 関数（line 184-201付近）
  - [ ] `runCheckCommand` 関数（line 203-239付近）
  - [ ] `runLintCommand` 関数（line 262-304付近）
  - [ ] `determineLintFormat` 関数（line 255-260付近）
  - [ ] `collectMarkdownFiles` 関数（line 241-253付近、lint専用の場合のみ）
  - [ ] `SyncCliOptions` 型定義（line 55）
  - [ ] `CheckCliOptions` 型定義（line 57-60）
  - [ ] `LintCliOptions` 型定義（line 62-65）
  - [ ] `CHECK_EXIT_CODES` のインポート（line 21、check専用の場合のみ）
- [ ] `packages/cli/tests/sync.e2e.test.js` を削除
- [ ] `packages/cli/tests/check.e2e.test.js` を削除
- [ ] `packages/cli/tests/lint.e2e.test.js` を削除
- [ ] `README.md` から以下を削除：
  - [ ] `eutelo sync` コマンドの説明セクション（line 528-535付近）
  - [ ] `eutelo check` コマンドの説明セクション（line 537-544付近）
  - [ ] `eutelo lint` コマンドの説明セクション（line 518-526付近）
  - [ ] README内の `eutelo check` への言及（line 516付近）
- [ ] 削除後に `npm test` を実行して、他のテストが正常に動作することを確認

### Refactor（整理）
- [ ] 未使用のインポートを削除
- [ ] コードフォーマットを実行
- [ ] 型定義の整理（未使用の型がないか確認）

---

## Acceptance Criteria
- [ ] `eutelo sync` コマンドが存在しない（`eutelo sync` 実行時にエラー）
- [ ] `eutelo check` コマンドが存在しない（`eutelo check` 実行時にエラー）
- [ ] `eutelo lint` コマンドが存在しない（`eutelo lint` 実行時にエラー）
- [ ] 削除されたコマンドに関連するテストファイルが存在しない
- [ ] README.md から削除されたコマンドの説明が削除されている
- [ ] 他のコマンド（`add`、`init`、`guard`、`graph` など）が正常に動作する
- [ ] `npm test` が成功する（削除されたコマンドのテストを除く）

---

## Definition of Done (DoD)
- コード：
  - [ ] `packages/cli/src/index.ts` から対象コマンド・関数・型定義が削除されている
  - [ ] 未使用のインポートが削除されている
  - [ ] コードフォーマットが適用されている
- テスト：
  - [ ] 削除対象のE2Eテストファイルが削除されている
  - [ ] 他のテストが正常に動作することを確認
- ドキュメント：
  - [ ] `README.md` から削除されたコマンドの説明が削除されている
  - [ ] PRD-EUTELO-CONFIG-DOC-TYPES に削除が反映されていることを確認

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

