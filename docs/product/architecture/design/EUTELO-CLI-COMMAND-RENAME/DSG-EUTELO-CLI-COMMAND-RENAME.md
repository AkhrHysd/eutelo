---
id: DSG-EUTELO-CLI-COMMAND-RENAME
type: design
feature: eutelo-cli-command-rename
title: Eutelo CLI コマンド名変更 設計仕様
purpose: >
  `eutelo guard` を `eutelo align` に、`eutelo validate` を `eutelo rule` に変更するための
  実装設計を定義する。後方互換性を維持しつつ、段階的な移行を可能にする。
status: draft
version: 0.1
parent: PRD-EUTELO-CLI-COMMAND-RENAME
owners: ["@AkhrHysd"]
tags: ["cli", "command-rename", "design"]
last_updated: "2025-01-27"
---

# DSG-EUTELO-CLI-COMMAND-RENAME
Eutelo CLI コマンド名変更 設計仕様

---

## Background

PRDで定義されたコマンド名変更を実現するため、以下の設計を行う：

- `eutelo guard` → `eutelo align` への変更
- `eutelo validate` → `eutelo rule` への変更
- 後方互換性の維持（エイリアスと非推奨警告）
- 段階的な移行戦略

---

## Goals

- 新コマンド名（`eutelo align`、`eutelo rule`）を追加
- 旧コマンド名（`eutelo guard`、`eutelo validate`）をエイリアスとして保持
- 旧コマンド名使用時に非推奨警告を表示
- 既存の機能は一切変更しない（名前のみ変更）

---

## Overview

### アーキテクチャ構成

```
CLI Layer (packages/cli/src/index.ts)
  ├── eutelo align [documents...] (新コマンド)
  │   └── runGuardCommand (既存実装を再利用)
  ├── eutelo guard [documents...] (エイリアス、非推奨警告付き)
  │   └── runGuardCommand (既存実装を再利用)
  ├── eutelo rule [documents...] (新コマンド)
  │   └── runValidateCommand (既存実装を再利用)
  └── eutelo validate [documents...] (エイリアス、非推奨警告付き)
      └── runValidateCommand (既存実装を再利用)
```

### データフロー

```
ユーザー入力
  ├── eutelo align → 非推奨警告なし → runGuardCommand → GuardService
  ├── eutelo guard → 非推奨警告表示 → runGuardCommand → GuardService
  ├── eutelo rule → 非推奨警告なし → runValidateCommand → RuleValidationService
  └── eutelo validate → 非推奨警告表示 → runValidateCommand → RuleValidationService
```

---

## Structure

### 1. コマンド定義の追加

**ファイル**: `packages/cli/src/index.ts`

#### 1.1 `eutelo align` コマンドの追加

既存の `eutelo guard` コマンド定義をコピーし、`eutelo align` として追加する。
既存の `runGuardCommand` 関数をそのまま使用する。

```typescript
program
  .command('align [documents...]')
  .description('Check document consistency across related documents')
  .option('--format <format>', 'Output format (text or json)')
  .option('--fail-on-error', 'Exit with code 2 when issues are detected (default)')
  .option('--warn-only', 'Never exit with code 2, even when issues are detected')
  .option('--check <id>', 'Guard prompt id to execute (config.guard.prompts key)')
  .option('--config <path>', 'Path to eutelo.config.*')
  .option('--with-related', 'Automatically collect related documents (default: enabled)')
  .option('--no-related', 'Disable automatic related document collection')
  .option('--depth <number>', 'Depth for related document traversal (default: 1)')
  .option('--all', 'Collect all related documents regardless of depth')
  .action(async (options: GuardCliOptions = {}, documents: string[] = []) => {
    // 非推奨警告なしで実行
    const configPath = resolveOptionValue(argv, '--config');
    try {
      await withConfig(configPath, async (config) => {
        const docsRoot = resolveDocsRootFromConfig(config);
        const configuredGuardService = createGuardService({
          fileSystemAdapter,
          prompts: config.guard.prompts,
          frontmatterSchemas: config.frontmatter.schemas,
          scaffold: config.scaffold,
          docsRoot,
          cwd: process.cwd()
        });
        await runGuardCommand(configuredGuardService, documents, options, argv);
      });
    } catch (error) {
      handleCommandError(error);
    }
  });
```

#### 1.2 `eutelo rule` コマンドの追加

既存の `eutelo validate` コマンド定義をコピーし、`eutelo rule` として追加する。
既存の `runValidateCommand` 関数をそのまま使用する。

```typescript
program
  .command('rule [documents...]')
  .description('Validate documents against user-defined rules')
  .option('--format <format>', 'Output format (text or json)')
  .option('--fail-on-error', 'Exit with code 1 when rule violations are detected (default)')
  .option('--warn-only', 'Never exit with code 1, even when rule violations are detected')
  .option('--ci', 'CI mode (enables --format=json and --fail-on-error)')
  .option('--config <path>', 'Path to eutelo.config.*')
  .action(async (options: ValidateCliOptions = {}, documents: string[] = []) => {
    // 非推奨警告なしで実行
    const configPath = resolveOptionValue(argv, '--config');
    try {
      await withConfig(configPath, async (config) => {
        const docsRoot = resolveDocsRootFromConfig(config);
        const configuredValidationService = createRuleValidationService({
          fileSystemAdapter,
          docsRoot,
          cwd: process.cwd(),
          config
        });
        await runValidateCommand(configuredValidationService, documents, options, argv);
      });
    } catch (error) {
      handleCommandError(error);
    }
  });
```

### 2. エイリアスと非推奨警告の実装

#### 2.1 `eutelo guard` の非推奨警告

既存の `eutelo guard` コマンド定義に非推奨警告を追加する。

```typescript
program
  .command('guard [documents...]')
  .description('Run the experimental document guard consistency checks (deprecated: use "eutelo align" instead)')
  .option('--format <format>', 'Output format (text or json)')
  // ... 既存のオプション ...
  .action(async (options: GuardCliOptions = {}, documents: string[] = []) => {
    // 非推奨警告を表示
    process.stderr.write(
      'Warning: "eutelo guard" is deprecated and will be removed in a future version.\n' +
      'Please use "eutelo align" instead.\n\n'
    );
    
    // 既存の処理をそのまま実行
    const configPath = resolveOptionValue(argv, '--config');
    try {
      await withConfig(configPath, async (config) => {
        const docsRoot = resolveDocsRootFromConfig(config);
        const configuredGuardService = createGuardService({
          fileSystemAdapter,
          prompts: config.guard.prompts,
          frontmatterSchemas: config.frontmatter.schemas,
          scaffold: config.scaffold,
          docsRoot,
          cwd: process.cwd()
        });
        await runGuardCommand(configuredGuardService, documents, options, argv);
      });
    } catch (error) {
      handleCommandError(error);
    }
  });
```

#### 2.2 `eutelo validate` の非推奨警告

既存の `eutelo validate` コマンド定義に非推奨警告を追加する。

```typescript
program
  .command('validate [documents...]')
  .description('Validate documents against user-defined rules (deprecated: use "eutelo rule" instead)')
  .option('--format <format>', 'Output format (text or json)')
  // ... 既存のオプション ...
  .action(async (options: ValidateCliOptions = {}, documents: string[] = []) => {
    // 非推奨警告を表示
    process.stderr.write(
      'Warning: "eutelo validate" is deprecated and will be removed in a future version.\n' +
      'Please use "eutelo rule" instead.\n\n'
    );
    
    // 既存の処理をそのまま実行
    const configPath = resolveOptionValue(argv, '--config');
    try {
      await withConfig(configPath, async (config) => {
        const docsRoot = resolveDocsRootFromConfig(config);
        const configuredValidationService = createRuleValidationService({
          fileSystemAdapter,
          docsRoot,
          cwd: process.cwd(),
          config
        });
        await runValidateCommand(configuredValidationService, documents, options, argv);
      });
    } catch (error) {
      handleCommandError(error);
    }
  });
```

---

## Contracts

### CLI コマンド仕様

#### `eutelo align [documents...]`

- **説明**: ドキュメント間の一貫性をチェックする
- **オプション**: `eutelo guard` と同じ（`--format`, `--fail-on-error`, `--warn-only`, `--check`, `--config`, `--with-related`, `--no-related`, `--depth`, `--all`）
- **動作**: `eutelo guard` と完全に同じ（非推奨警告なし）

#### `eutelo rule [documents...]`

- **説明**: ユーザー定義ルールに対してドキュメントを検証する
- **オプション**: `eutelo validate` と同じ（`--format`, `--fail-on-error`, `--warn-only`, `--ci`, `--config`）
- **動作**: `eutelo validate` と完全に同じ（非推奨警告なし）

#### `eutelo guard [documents...]` (非推奨)

- **説明**: `eutelo align` のエイリアス（非推奨）
- **動作**: `eutelo align` と同じ（非推奨警告を表示）

#### `eutelo validate [documents...]` (非推奨)

- **説明**: `eutelo rule` のエイリアス（非推奨）
- **動作**: `eutelo rule` と同じ（非推奨警告を表示）

---

## Non-Functional Aspects

### 後方互換性

- 旧コマンド名（`eutelo guard`、`eutelo validate`）はエイリアスとして保持
- 既存のCI設定やスクリプトは引き続き動作する
- 非推奨警告により、ユーザーに移行を促す

### パフォーマンス

- コマンド名の追加によるパフォーマンスへの影響はない
- 非推奨警告の表示によるオーバーヘッドは無視できる程度

### 保守性

- 既存の実装（`runGuardCommand`、`runValidateCommand`）をそのまま再利用
- コードの重複を最小限に抑える
- 将来的に旧コマンド名を削除する際は、エイリアス部分のみを削除すればよい

---

## Future Considerations

### 移行期間後の対応

- 移行期間（6ヶ月）後、旧コマンド名（`eutelo guard`、`eutelo validate`）を削除
- エイリアスと非推奨警告のコードを削除
- ドキュメントから旧コマンド名への参照を削除

### 環境変数の変更

- 現在の環境変数名（`EUTELO_GUARD_API_ENDPOINT` など）は変更しない
- 将来的に環境変数名も変更する場合は、別途検討

---

## References

- [PRD-EUTELO-CLI-COMMAND-RENAME](../../features/EUTELO-CLI-COMMAND-RENAME/PRD-EUTELO-CLI-COMMAND-RENAME.md) - コマンド名変更PRD
- [PRD-DOC-GUARD](../../features/DOC-GUARD/PRD-DOC-GUARD.md) - Document Guard機能PRD
- [PRD-DOC-RULE-VALIDATION](../../features/DOC-RULE-VALIDATION/PRD-DOC-RULE-VALIDATION.md) - Document Rule Validation機能PRD

---

