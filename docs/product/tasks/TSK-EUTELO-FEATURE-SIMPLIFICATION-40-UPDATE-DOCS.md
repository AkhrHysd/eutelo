---
id: TSK-EUTELO-FEATURE-SIMPLIFICATION-40-UPDATE-DOCS
type: task
feature: EUTELO-FEATURE-SIMPLIFICATION
title: ドキュメント更新
purpose: >
  README、移行ガイド、CHANGELOGを更新し、削除された機能と移行方法を明記する。
status: pending
version: 0.1
owners: ["@AkhrHysd"]
related: [PRD-EUTELO-FEATURE-SIMPLIFICATION, DSG-EUTELO-FEATURE-SIMPLIFICATION]
due: ""
estimate:
  ideal_days: 2
  realistic_days: 3
  pessimistic_days: 4
last_updated: "2025-01-27"
---

# TSK-EUTELO-FEATURE-SIMPLIFICATION-40-UPDATE-DOCS

## Target BEH Scenarios
- READMEから削除されたコマンド・オプションの説明が削除されている
- 移行ガイドが追加され、削除された機能の代替方法が明記されている
- CHANGELOGに破壊的変更が記録されている
- ユーザーが削除された機能の代替方法を理解できる

## TDD Plan
### Red
- [ ] READMEの更新内容をレビュー
- [ ] 移行ガイドの内容をレビュー
- [ ] CHANGELOGの内容をレビュー

### Green
- [ ] READMEを更新
- [ ] 移行ガイドを作成
- [ ] CHANGELOGを更新

### Refactor
- [ ] ドキュメントの一貫性を確認
- [ ] リンクの整合性を確認

## Acceptance Criteria
- [ ] READMEから`eutelo graph`コマンドの説明が削除されている
- [ ] READMEから`eutelo config inspect`コマンドの説明が削除されている
- [ ] READMEから`eutelo init --placeholder-format`オプションの説明が削除されている
- [ ] READMEから`eutelo guard --japanese`オプションの説明が削除されている
- [ ] READMEに組み込み種別の非推奨警告についての説明が追加されている
- [ ] 移行ガイドが作成されている
- [ ] CHANGELOGに破壊的変更が記録されている

## DoD
- [ ] READMEが更新されている
- [ ] README.jp.mdが更新されている
- [ ] 移行ガイドが作成されている
- [ ] CHANGELOGが更新されている
- [ ] ドキュメントのレビューが完了している

## Implementation Details

### 変更対象ファイル
- `README.md`
- `README.jp.md`
- `CHANGELOG.md`
- `docs/product/tasks/MIGRATION-GUIDE-EUTELO-FEATURE-SIMPLIFICATION.md`（新規作成）

### 実装内容

#### 1. READMEの更新

**削除するセクション:**
- `### eutelo graph`セクション全体
  - `#### eutelo graph build`
  - `#### eutelo graph show <documentId>`
  - `#### eutelo graph impact <documentId>`
  - `#### eutelo graph related <documentId>`
  - `#### eutelo graph summary`
- `### eutelo config inspect`セクション全体

**更新するセクション:**
- `### eutelo init`セクション
  - `--placeholder-format`オプションの説明を削除
- `### eutelo guard`セクション
  - `--japanese, --ja`オプションの説明を削除
- `### eutelo add`セクション
  - 組み込み種別の非推奨警告についての説明を追加

**追加するセクション:**
- 移行ガイドへのリンクを追加

#### 2. README.jp.mdの更新

README.mdと同様の更新を実施。

#### 3. 移行ガイドの作成

**ファイル**: `docs/product/tasks/MIGRATION-GUIDE-EUTELO-FEATURE-SIMPLIFICATION.md`

**内容:**
- 削除された機能の一覧
- 各機能の代替方法
- 移行手順
- よくある質問

**例:**
```markdown
# Eutelo 機能簡素化 移行ガイド

## 概要

Eutelo v2.0.0では、本来のコンセプトに合致しない機能を削除しました。
このガイドでは、削除された機能の代替方法を説明します。

## 削除された機能

### 1. `eutelo graph` コマンド

すべての`eutelo graph`サブコマンドが削除されました。

#### 代替方法

| 削除コマンド | 代替方法 |
|------------|---------|
| `eutelo graph build` | 削除。グラフの可視化が必要な場合は、外部ツールを使用 |
| `eutelo graph show` | 削除。ドキュメントの関係性は`eutelo guard`の出力で確認 |
| `eutelo graph impact` | 削除。影響範囲は`eutelo guard`の関連ドキュメント収集機能で確認 |
| `eutelo graph summary` | 削除。統計情報が必要な場合は、設定ファイルやドキュメント構造から確認 |
| `eutelo graph related` | 削除。`eutelo guard`の関連ドキュメント収集機能で代替 |

### 2. `eutelo config inspect` コマンド

設定ファイル（`eutelo.config.*`）を直接確認してください。

### 3. `eutelo init --placeholder-format` オプション

このオプションは削除されました。プレースホルダー形式は固定形式（`__VARIABLE__`）を使用します。

### 4. `eutelo guard --japanese` オプション

このオプションは削除されました。LLMの応答言語は、プロンプトテンプレートやモデル設定で制御してください。

### 5. 組み込みドキュメント種別の非推奨化

組み込み種別（`prd`, `beh`, `sub-prd`, `sub-beh`, `dsg`, `adr`, `task`, `ops`）は非推奨です。
カスタム種別を設定ファイルで定義して使用してください。

#### 移行手順

1. `eutelo.config.ts`でカスタム種別を定義
2. `eutelo add <kind>`を使用

詳細はREADMEを参照してください。
```

#### 4. CHANGELOGの更新

**追加する内容:**
```markdown
## [2.0.0] - 2025-01-XX

### Breaking Changes

#### 削除されたコマンド
- `eutelo graph`コマンド全体を削除
  - `eutelo graph build`
  - `eutelo graph show <documentId>`
  - `eutelo graph impact <documentId>`
  - `eutelo graph summary`
  - `eutelo graph related <documentPath>`
- `eutelo config inspect`コマンドを削除

#### 削除されたオプション
- `eutelo init --placeholder-format`オプションを削除
- `eutelo guard --japanese`/`--ja`オプションを削除

#### 非推奨
- `eutelo add`の組み込みドキュメント種別（`prd`, `beh`, `sub-prd`, `sub-beh`, `dsg`, `adr`, `task`, `ops`）を非推奨化
  - カスタム種別を設定ファイルで定義して使用することを推奨

### Migration Guide

詳細な移行ガイドは `docs/product/tasks/MIGRATION-GUIDE-EUTELO-FEATURE-SIMPLIFICATION.md` を参照してください。
```

## Risks / Dependencies
- リスク: ドキュメントの更新漏れにより、ユーザーが混乱する可能性
- 対策: ドキュメントレビューを実施し、一貫性を確認
- 依存: TSK-EUTELO-FEATURE-SIMPLIFICATION-30-REMOVE-COMMANDS（完了後）

## Notes
- ドキュメントの更新は、実装完了後に実施する
- 移行ガイドは、削除された機能の代替方法を明確に説明する
- CHANGELOGは、破壊的変更として明記する

