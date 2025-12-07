---
id: TSK-EUTELO-FEATURE-SIMPLIFICATION-20-REMOVE-OPTIONS
type: task
feature: EUTELO-FEATURE-SIMPLIFICATION
title: 過剰なオプションの削除
purpose: >
  `eutelo init --placeholder-format`と`eutelo guard --japanese`/`--ja`オプションを削除し、
  コマンドラインインターフェースを簡素化する。
status: pending
version: 0.1
owners: ["@AkhrHysd"]
related: [PRD-EUTELO-FEATURE-SIMPLIFICATION, DSG-EUTELO-FEATURE-SIMPLIFICATION]
due: ""
estimate:
  ideal_days: 1
  realistic_days: 1
  pessimistic_days: 2
last_updated: "2025-01-27"
---

# TSK-EUTELO-FEATURE-SIMPLIFICATION-20-REMOVE-OPTIONS

## Target BEH Scenarios
- `eutelo init --placeholder-format`オプションが削除され、エラーまたは無視される
- `eutelo guard --japanese`/`--ja`オプションが削除され、エラーまたは無視される
- 既存の機能（`eutelo init`, `eutelo guard`）は正常に動作し続ける

## TDD Plan
### Red
- [ ] 削除されたオプションが無視されることを検証するテストを書く
- [ ] 既存の機能が正常に動作することを検証するテストを書く

### Green
- [ ] `InitCliOptions`型から`placeholderFormat`を削除
- [ ] `GuardCliOptions`型から`japanese`を削除
- [ ] オプション定義を削除
- [ ] オプション処理ロジックを削除

### Refactor
- [ ] 不要になった型定義を整理
- [ ] コメントを更新

## Acceptance Criteria
- [ ] `eutelo init --placeholder-format <format>`が無視される（またはエラーになる）
- [ ] `eutelo guard --japanese`が無視される（またはエラーになる）
- [ ] `eutelo guard --ja`が無視される（またはエラーになる）
- [ ] `eutelo init`は正常に動作する
- [ ] `eutelo guard`は正常に動作する
- [ ] 型定義から削除されたフィールドが存在しない

## DoD
- [ ] オプション定義が削除されている
- [ ] 型定義が更新されている
- [ ] オプション処理ロジックが削除されている
- [ ] テストが更新されている
- [ ] コードレビューが完了している

## Implementation Details

### 変更対象ファイル
- `packages/cli/src/index.ts`

### 実装内容

#### 1. `eutelo init --placeholder-format`の削除

**削除対象:**
- `InitCliOptions`型の`placeholderFormat`フィールド（行45）
- `--placeholder-format`オプション定義（行684）
- プレースホルダー形式の処理ロジック（行702-707）

**変更内容:**
```typescript
// 変更前
type InitCliOptions = {
  dryRun?: boolean;
  createPlaceholders?: boolean;
  skipDynamicPaths?: boolean;
  placeholderFormat?: string;  // 削除
};

// 変更後
type InitCliOptions = {
  dryRun?: boolean;
  createPlaceholders?: boolean;
  skipDynamicPaths?: boolean;
};
```

```typescript
// オプション定義を削除
.option('--placeholder-format <format>', 'Placeholder format (default: __VARIABLE__)')  // 削除
```

```typescript
// 処理ロジックを削除
if (options.placeholderFormat) {
  // 形式: "__VARIABLE__" または "[VARIABLE]" など
  // 現在は固定形式を使用
  // TODO: 将来的にカスタム形式をサポート
}  // 削除
```

#### 2. `eutelo guard --japanese`/`--ja`の削除

**削除対象:**
- `GuardCliOptions`型の`japanese`フィールド（行62）
- `--japanese, --ja`オプション定義（行1043）
- `japanese`オプションの処理ロジック（行209）

**変更内容:**
```typescript
// 変更前
type GuardCliOptions = {
  format?: string;
  failOnError?: boolean;
  warnOnly?: boolean;
  check?: string;
  related?: boolean;
  depth?: string;
  all?: boolean;
  japanese?: boolean;  // 削除
};

// 変更後
type GuardCliOptions = {
  format?: string;
  failOnError?: boolean;
  warnOnly?: boolean;
  check?: string;
  related?: boolean;
  depth?: string;
  all?: boolean;
};
```

```typescript
// オプション定義を削除
.option('--japanese, --ja', 'Output results in Japanese')  // 削除
```

```typescript
// 処理ロジックを削除
const japanese = options.japanese || argv.includes('--japanese') || argv.includes('--ja');  // 削除
// ...
japanese  // runGuardCommand の呼び出しから削除
```

### テスト更新
- `packages/cli/tests/init.e2e.test.js`を更新（`--placeholder-format`のテストを削除）
- `packages/cli/tests/guard.e2e.test.js`を更新（`--japanese`のテストを削除）

## Risks / Dependencies
- リスク: 既存のワークフローでこれらのオプションを使用している場合、影響が発生する
- 対策: 削除前にCHANGELOGで非推奨を明記し、移行期間を設ける
- 依存: TSK-EUTELO-FEATURE-SIMPLIFICATION-10-DEPRECATION-WARNINGS（完了後）

## Notes
- これらのオプションは未実装または使用頻度が低いため、削除による影響は限定的
- `--placeholder-format`は未実装の機能であり、削除による機能損失はない
- `--japanese`は出力言語指定であり、プロンプトテンプレートで制御可能

