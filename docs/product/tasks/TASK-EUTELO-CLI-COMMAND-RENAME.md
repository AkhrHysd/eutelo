---
id: TASK-EUTELO-CLI-COMMAND-RENAME
type: task
title: Eutelo CLI コマンド名変更 実装タスクリスト
purpose: >
  PRD-EUTELO-CLI-COMMAND-RENAME / DSG-EUTELO-CLI-COMMAND-RENAME に基づき、
  `eutelo guard` → `eutelo align`、`eutelo validate` → `eutelo rule` への
  コマンド名変更を実装するためのタスクを整理する。
status: draft
version: 0.1
owners: ["@AkhrHysd"]
parent: PRD-EUTELO-CLI-COMMAND-RENAME
last_updated: "2025-01-27"
---

# TASK-EUTELO-CLI-COMMAND-RENAME
Eutelo CLI コマンド名変更 — 実装タスクリスト

---

## 0. 原則（このタスク群全体に適用）

- 仕様はすべて PRD / DSG に準拠する。
- 1タスク = 1つ以上の Red → Green テスト完了を基準にする。
- タスクは 300 行以内で完結する粒度に分割する。
- 優先順位は「CLI → テスト → ドキュメント」の流れを基本とする。
- 既存の実装（`runGuardCommand`、`runValidateCommand`）は変更しない。

---

# 1. CLI 層 — 新コマンド名の追加（Red → Green）

## 1-1. `eutelo align` コマンドの追加

- [ ] `eutelo align` コマンドが存在することを確認する E2E テストを書く（Red）。
- [ ] `packages/cli/src/index.ts` に `eutelo align` コマンド定義を追加する（Green）。
- [ ] 既存の `runGuardCommand` 関数をそのまま使用する実装を行う。
- [ ] `eutelo align` が `eutelo guard` と同じ動作をすることを確認する E2E テストを追加する。

## 1-2. `eutelo rule` コマンドの追加

- [ ] `eutelo rule` コマンドが存在することを確認する E2E テストを書く（Red）。
- [ ] `packages/cli/src/index.ts` に `eutelo rule` コマンド定義を追加する（Green）。
- [ ] 既存の `runValidateCommand` 関数をそのまま使用する実装を行う。
- [ ] `eutelo rule` が `eutelo validate` と同じ動作をすることを確認する E2E テストを追加する。

---

# 2. CLI 層 — 非推奨警告の実装（Red → Green）

## 2-1. `eutelo guard` の非推奨警告

- [ ] `eutelo guard` 実行時に非推奨警告が表示されることを確認する E2E テストを書く（Red）。
- [ ] `eutelo guard` コマンド定義に非推奨警告を追加する（Green）。
- [ ] 警告メッセージが適切であることを確認するテストを追加する。
- [ ] 警告表示後も正常に動作することを確認するテストを追加する。

## 2-2. `eutelo validate` の非推奨警告

- [ ] `eutelo validate` 実行時に非推奨警告が表示されることを確認する E2E テストを書く（Red）。
- [ ] `eutelo validate` コマンド定義に非推奨警告を追加する（Green）。
- [ ] 警告メッセージが適切であることを確認するテストを追加する。
- [ ] 警告表示後も正常に動作することを確認するテストを追加する。

---

# 3. テスト — E2E テストの追加（Red → Green）

## 3-1. `eutelo align` の E2E テスト

- [ ] `eutelo align` が正常に動作することを確認する E2E テストを追加する。
- [ ] `eutelo align` のオプション（`--format`, `--fail-on-error`, `--warn-only` など）が正常に動作することを確認するテストを追加する。
- [ ] `eutelo align` が `eutelo guard` と同じ結果を返すことを確認するテストを追加する。

## 3-2. `eutelo rule` の E2E テスト

- [ ] `eutelo rule` が正常に動作することを確認する E2E テストを追加する。
- [ ] `eutelo rule` のオプション（`--format`, `--fail-on-error`, `--warn-only`, `--ci` など）が正常に動作することを確認するテストを追加する。
- [ ] `eutelo rule` が `eutelo validate` と同じ結果を返すことを確認するテストを追加する。

## 3-3. 非推奨警告の E2E テスト

- [ ] `eutelo guard` 実行時に非推奨警告が表示されることを確認する E2E テストを追加する。
- [ ] `eutelo validate` 実行時に非推奨警告が表示されることを確認する E2E テストを追加する。
- [ ] 警告表示後も正常に動作することを確認するテストを追加する。

---

# 4. ドキュメント — README の更新

## 4-1. README の更新

- [ ] `README.md` の `eutelo guard` セクションを `eutelo align` に更新する。
- [ ] `README.md` の `eutelo validate` セクションを `eutelo rule` に更新する。
- [ ] 旧コマンド名への参照を非推奨として明記する。
- [ ] 移行ガイドを追加する。

## 4-2. README.jp.md の更新

- [ ] `README.jp.md` の `eutelo guard` セクションを `eutelo align` に更新する。
- [ ] `README.jp.md` の `eutelo validate` セクションを `eutelo rule` に更新する。
- [ ] 旧コマンド名への参照を非推奨として明記する。
- [ ] 移行ガイドを追加する。

## 4-3. その他のドキュメントの更新

- [ ] `docs/ops/runbook-eutelo-cli-ci.md` を更新する。
- [ ] CI 設定例（`.github/workflows/*.yml`）を更新する。
- [ ] サンプルコードやテンプレートを更新する。

---

# 5. CHANGELOG の更新

## 5-1. CHANGELOG の追加

- [ ] `packages/cli/CHANGELOG.md` にコマンド名変更の内容を追加する。
- [ ] 非推奨警告についての説明を追加する。
- [ ] 移行ガイドへのリンクを追加する。

---

## Acceptance Criteria

- [ ] `eutelo align` コマンドが正常に動作する
- [ ] `eutelo rule` コマンドが正常に動作する
- [ ] `eutelo guard` 実行時に非推奨警告が表示される
- [ ] `eutelo validate` 実行時に非推奨警告が表示される
- [ ] 旧コマンド名も引き続き動作する（後方互換性）
- [ ] すべての E2E テストが通過する
- [ ] README が更新されている
- [ ] CHANGELOG が更新されている

## Definition of Done (DoD)

### テスト
- [ ] Red→Green→Refactor の痕跡（履歴/ログ）が残っている
- [ ] E2E テストが追加され、すべて通過する
- [ ] 既存のテストが引き続き通過する

### ドキュメント
- [ ] `README.md` が更新されている
- [ ] `README.jp.md` が更新されている
- [ ] `CHANGELOG.md` が更新されている
- [ ] 移行ガイドが追加されている

### コード
- [ ] `packages/cli/src/index.ts` に新コマンド名が追加されている
- [ ] 非推奨警告が実装されている
- [ ] 既存の実装（`runGuardCommand`、`runValidateCommand`）は変更されていない

## PR Constraints（AI前提の粒度）

- 差分（+/-）≦ **300行**
- 影響ファイル ≦ **5〜7**
- 主な変更箇所:
  - `packages/cli/src/index.ts`（コマンド定義の追加）
  - `packages/cli/tests/*.e2e.test.js`（E2E テストの追加）
  - `README.md`、`README.jp.md`（ドキュメントの更新）
  - `packages/cli/CHANGELOG.md`（変更履歴の追加）

## Risks / Dependencies

### リスク
- 既存のCI設定やスクリプトで旧コマンド名が使用されている場合、非推奨警告が表示される
- ユーザーが混乱する可能性がある（移行ガイドで対応）

### 依存
- 既存の `runGuardCommand`、`runValidateCommand` 関数に依存
- 既存の `GuardService`、`RuleValidationService` に依存

## Notes

- 既存の実装は一切変更しない（名前のみ変更）
- 後方互換性を維持するため、旧コマンド名も引き続き動作する
- 移行期間（6ヶ月）後、旧コマンド名を削除する予定

---

