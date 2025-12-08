---
id: TSK-EUTELO-FEATURE-SIMPLIFICATION-10-DEPRECATION-WARNINGS
type: task
feature: EUTELO-FEATURE-SIMPLIFICATION
title: 組み込みドキュメント種別の非推奨警告追加
purpose: >
  `eutelo add`の組み込みドキュメント種別（prd, beh, sub-prd, sub-beh, dsg, adr, task, ops）
  に非推奨警告を追加し、カスタム種別の使用を推奨する。
status: completed
version: 0.1
owners: ["@AkhrHysd"]
related: [PRD-EUTELO-FEATURE-SIMPLIFICATION, DSG-EUTELO-FEATURE-SIMPLIFICATION]
due: ""
estimate:
  ideal_days: 1
  realistic_days: 2
  pessimistic_days: 3
last_updated: "2025-01-27"
---

# TSK-EUTELO-FEATURE-SIMPLIFICATION-10-DEPRECATION-WARNINGS

## Target BEH Scenarios
- 組み込み種別（`prd`, `beh`, `sub-prd`, `sub-beh`, `dsg`, `adr`, `task`, `ops`）を使用した際に警告メッセージが表示される
- 警告メッセージには、カスタム種別の使用を推奨する内容が含まれる
- 警告表示後も処理は継続し、ドキュメントは正常に作成される

## TDD Plan
### Red
- [ ] 組み込み種別使用時に警告が表示されることを検証するテストを書く
- [ ] 警告メッセージの内容を検証するテストを書く
- [ ] 警告表示後も処理が継続することを検証するテストを書く

### Green
- [ ] `packages/cli/src/index.ts`の各組み込み種別コマンドに警告メッセージを追加
- [ ] 警告メッセージを`process.stderr.write()`で出力
- [ ] 警告表示後も処理を継続

### Refactor
- [ ] 警告メッセージを共通関数に抽出
- [ ] 警告メッセージの内容を定数として定義

## Acceptance Criteria
- [ ] `eutelo add prd <feature>`実行時に非推奨警告が表示される
- [ ] `eutelo add beh <feature>`実行時に非推奨警告が表示される
- [ ] `eutelo add sub-prd <feature> <sub>`実行時に非推奨警告が表示される
- [ ] `eutelo add sub-beh <feature> <sub>`実行時に非推奨警告が表示される
- [ ] `eutelo add dsg <feature>`実行時に非推奨警告が表示される
- [ ] `eutelo add adr <feature>`実行時に非推奨警告が表示される
- [ ] `eutelo add task <name>`実行時に非推奨警告が表示される
- [ ] `eutelo add ops <name>`実行時に非推奨警告が表示される
- [ ] 警告メッセージにカスタム種別の使用を推奨する内容が含まれる
- [ ] 警告表示後もドキュメントは正常に作成される

## DoD
- [ ] すべての組み込み種別に非推奨警告が追加されている
- [ ] 警告メッセージのテストが追加されている
- [ ] E2Eテストで警告表示を検証している
- [ ] コードレビューが完了している

## Implementation Details

### 変更対象ファイル
- `packages/cli/src/index.ts`

### 実装内容
1. 警告メッセージを表示する共通関数を作成
   ```typescript
   function showDeprecationWarning(type: string): void {
     process.stderr.write(
       `Warning: 'eutelo add ${type}' is deprecated. ` +
       `Please define custom document types in eutelo.config.* and use 'eutelo add <kind>' instead.\n`
     );
   }
   ```

2. 各組み込み種別のコマンド定義で、`action`の最初に警告を表示
   ```typescript
   add
     .command('prd <feature>')
     .description('Generate a PRD document for the given feature')
     .option('--config <path>', 'Path to eutelo.config.*')
     .action(async (feature: string) => {
       showDeprecationWarning('prd');
       // 既存の処理を継続
       // ...
     });
   ```

3. 対象となる組み込み種別:
   - `prd`
   - `beh`
   - `sub-prd`
   - `sub-beh`
   - `dsg`
   - `adr`
   - `task`
   - `ops`

### テスト追加
- `packages/cli/tests/add.e2e.test.js`に警告表示のテストを追加
- 各組み込み種別について警告が表示されることを検証

## Risks / Dependencies
- リスク: 警告メッセージが多すぎてユーザー体験を損なう可能性
- 対策: 警告メッセージは簡潔にし、カスタム種別の定義方法をREADMEで説明
- 依存: なし

## Notes
- このタスクは後方互換性を維持しながら、将来の完全削除への移行を促す
- 警告メッセージは`stderr`に出力し、`stdout`の出力には影響を与えない

