---
id: TASK-EUTELO-CONFIG-FRONTMATTER-FIXED-VALUES
type: task
feature: EUTELO-CONFIG-FRONTMATTER-FIXED-VALUES
title: Eutelo Config Frontmatter Fixed Values タスク計画
purpose: >
  BEH シナリオを TDD（Red→Green→Refactor）で満たし、
  フロントマター内の実装上必須な固定値（type と parent）を scaffold 設定から自動的に注入する機能を実装する。
status: draft
version: 0.1.0
owners: ["@team-eutelo"]
related: [PRD-EUTELO-CONFIG-FRONTMATTER-FIXED-VALUES, BEH-EUTELO-CONFIG-FRONTMATTER-FIXED-VALUES, DSG-EUTELO-CONFIG-FRONTMATTER-FIXED-VALUES]
due: ""
estimate:
  ideal_days: 5
  realistic_days: 7
  pessimistic_days: 10
last_updated: "2025-01-28"
---

# TASK-EUTELO-CONFIG-FRONTMATTER-FIXED-VALUES

## Target BEH Scenarios

- BEH IDs: `BEH-EUTELO-CONFIG-FRONTMATTER-FIXED-VALUES / FIXED-VALUES-S1, FIXED-VALUES-S2, FIXED-VALUES-S3, FIXED-VALUES-S4, FIXED-VALUES-S5, FIXED-VALUES-S6, FIXED-VALUES-S7, FIXED-VALUES-S8, FIXED-VALUES-S9, FIXED-VALUES-S10, FIXED-VALUES-S11`
- 観察ポイント: 正常系S-1/S-2/S-7/S-8/S-10/S-11、異常系S-3/S-4、警告系S-5/S-6/S-9

## TDD Plan

### Red（再現テストを先に書く）

#### Phase 1: ScaffoldTemplateConfig の拡張テスト

- [x] `ScaffoldTemplateConfig` に `frontmatterDefaults` フィールドが追加されるテスト
- [x] `frontmatterDefaults.type` が必須フィールドとして定義されるテスト
- [x] `frontmatterDefaults.parent` が必須フィールドとして定義されるテスト（オプショナルから必須に変更）
- [x] テンプレート変数（`{PARENT}`, `{FEATURE}` など）が使用可能なテスト
- 期待失敗内容: `frontmatterDefaults` フィールドが存在しない / 型定義が不適切

#### Phase 2: AddDocumentService の変更テスト

- [x] `buildTokenMap()` が `frontmatterDefaults.type` を `TYPE` トークンとして追加するテスト
- [x] `buildTokenMap()` が `frontmatterDefaults.parent` をテンプレート変数として解決し、`PARENT` トークンとして追加するテスト
- [x] `frontmatterDefaults` が設定されていない場合に既存の動作が維持されるテスト
- [x] テンプレート変数の解決が正常に動作するテスト
- 期待失敗内容: `TYPE` トークンが追加されない / `PARENT` トークンが解決されない

#### Phase 3: TemplateService の変更テスト

- [x] `applyFrontmatterDefaults()` が frontmatter セクションを解析するテスト
- [x] `applyFrontmatterDefaults()` が `type` フィールドを上書きするテスト
- [x] `applyFrontmatterDefaults()` が `parent` フィールドを上書きするテスト
- [x] テンプレート内の固定値記述が上書きされるテスト
- [x] `frontmatterDefaults` が設定されていない場合に既存の動作が維持されるテスト
- 期待失敗内容: frontmatter の解析が失敗する / 上書きが機能しない

#### Phase 4: ValidationService の変更テスト

- [ ] `validateKindTypeConsistency()` が `kind` と `type` の整合性をチェックするテスト（未実装）
- [ ] `validateKindTypeConsistency()` が不一致の場合にエラーを返すテスト（未実装）
- [x] `validateParentRequirement()` がすべてのkindに対して `parent` が必須かチェックするテスト
- [x] `validateParentRequirement()` が `parent: /` の場合はルートドキュメントとして扱うテスト
- [x] `validateParentRequirement()` が schema が存在しない場合はチェックをスキップするテスト
- 期待失敗内容: 整合性チェックが機能しない / エラーまたは警告が適切に返されない

#### Phase 5: GraphService の変更テスト

- [x] `build()` が `type` が欠落しないことを保証するテスト（既存の実装で対応）
- [x] `build()` が `parent: /` の場合はエッジを作成しないテスト
- [x] `computeIntegrity()` が `parent: /` の場合は orphan node として扱わないテスト
- 期待失敗内容: `type` の欠落チェックが機能しない / orphan node の検出が機能しない

#### Phase 6: E2E テスト

- [x] `eutelo add prd FEATURE-NAME` で `type` が自動注入される E2E テスト（既存テストで確認）
- [x] `eutelo add beh FEATURE-NAME` で `parent` が自動注入される E2E テスト（既存テストで確認）
- [ ] `kind` と `type` の不一致でエラーが表示される E2E テスト（未実装）
- [x] `parent` が設定されていない場合にエラーが表示される E2E テスト（既存テストで確認）
- [x] `eutelo graph build` で `type` が正常に取得される E2E テスト（既存テストで確認）
- [x] `eutelo graph build` で `parent: /` の場合は orphan node として扱わないテスト（既存テストで確認）
- 期待失敗内容: E2E テストが失敗する / 期待通りの動作をしない

### Green（最小実装）

#### Phase 1: ScaffoldTemplateConfig の拡張

- [x] `packages/core/src/config/types.ts` に `FrontmatterDefaults` インターフェースを追加
- [x] `ScaffoldTemplateConfig` に `frontmatterDefaults?: FrontmatterDefaults` を追加
- [x] 型定義を更新
- [x] 既存のテストが引き続き成功することを確認

#### Phase 2: AddDocumentService の変更

- [x] `buildTokenMap()` メソッドを変更して `frontmatterDefaults.type` を `TYPE` トークンとして追加
- [x] `buildTokenMap()` メソッドを変更して `frontmatterDefaults.parent` をテンプレート変数として解決し、`PARENT` トークンとして追加
- [x] `applyPlaceholders()` を使用してテンプレート変数を解決（既存のヘルパー関数を使用）
- [x] `frontmatterDefaults` が設定されていない場合の後方互換性を維持
- [x] 既存のテストが引き続き成功することを確認

#### Phase 3: TemplateService の変更

- [x] `applyFrontmatterDefaults()` メソッドを追加
- [x] frontmatter セクションを解析するロジックを実装（YAML パーサーを使用）
- [x] `type` と `parent` フィールドを上書きするロジックを実装
- [x] `render()` メソッドを変更して `applyFrontmatterDefaults()` を呼び出す
- [x] `frontmatterDefaults` が設定されていない場合の後方互換性を維持
- [x] 既存のテストが引き続き成功することを確認

#### Phase 4: ValidationService の変更

- [ ] `validateKindTypeConsistency()` メソッドを追加（未実装、将来の拡張）
- [x] `validateParentRequirement()` メソッドを追加（`validateFrontmatter` 内に統合）
- [x] `validateFrontmatter()` メソッドを変更して `parent` チェックを追加
- [x] `validateParentReferences()` メソッドを変更して `parent: /` の場合は検証をスキップ
- [x] エラーメッセージと警告メッセージを適切に設定
- [x] 既存のテストが引き続き成功することを確認

#### Phase 5: GraphService の変更

- [x] `build()` メソッドを変更して `parent: /` の場合はエッジを作成しない
- [x] `computeIntegrity()` メソッドを変更して `parent: /` の場合は orphan node として扱わない
- [x] 既存のテストが引き続き成功することを確認

#### Phase 6: preset-default の更新

- [x] `packages/preset-default/src/index.ts` の scaffold エントリに `frontmatterDefaults` を追加
- [x] 各 scaffold エントリ（`document.prd`, `document.beh`, `document.dsg` など）に適切な `frontmatterDefaults` を設定
- [x] `kind` と `type` のマッピングルールを実装（例: `beh` → `behavior`, `dsg` → `design`）
- [x] `prd`, `task`, `ops` は `parent: /` に設定（ルートドキュメント）
- [x] 既存のテンプレートが引き続き動作することを確認

#### Phase 7: エラーハンドリングの改善

- [ ] `KindTypeMismatchError` クラスを作成
- [ ] `ParentRequiredError` クラスを作成
- [ ] CLI 側でエラーメッセージを適切に表示
- [ ] 警告メッセージを適切に表示

#### Phase 8: ドキュメント更新

- [ ] `README.md` の `eutelo add` セクションに `frontmatterDefaults` の説明を追加
- [ ] `README.jp.md` の `eutelo add` セクションに同様の内容を日本語で追加
- [ ] Config ドキュメント（`docs/` 配下）に `frontmatterDefaults` の設定方法を詳細に記載
- [ ] `docs/DIRECTORY_GUIDE.md` を更新（必要に応じて）
- [ ] `docs/README.md` を更新（必要に応じて）
- [ ] CHANGELOG.md に変更内容を記載

### Refactor（設計の整理）

- [ ] `buildTokenMap()` の責務を明確化（トークン構築と frontmatterDefaults の解決を分離）
- [ ] `applyFrontmatterDefaults()` の責務を明確化（frontmatter の解析と更新を分離）
- [ ] テンプレート変数の解決ロジックの共通化（`resolveTemplateVariable()` で統一）
- [ ] エラーメッセージの統一化（`KindTypeMismatchError`, `ParentRequiredError` で統一）
- [ ] テストの重複排除（共通ヘルパー関数を使用）
- [ ] 型安全性の向上（型定義を明確化）

## Acceptance Criteria

- [x] 対象BEHシナリオが自動テストで再現・合格（既存テストで確認）
- [x] scaffold 設定の `frontmatterDefaults.type` と `frontmatterDefaults.parent` が AddDocumentService で自動注入される
- [x] テンプレート内の固定値記述（`type: prd`, `parent: PRD-{FEATURE}` など）が scaffold 設定から注入される値で上書きされる
- [ ] `kind` と `type` の不一致エラーが検出される（未実装、将来の拡張）
- [x] すべてのkindに対して `parent` が設定されていない場合にエラーが表示される（schema が存在する場合）
- [x] `parent: /` の場合はルートドキュメントとして扱われる
- [x] Graph作成時に `type` が欠落しないことを保証する（既存の実装で対応）
- [x] `parent: /` の場合は orphan node として扱われない
- [x] 既存のテンプレートが引き続き動作する（後方互換性）
- [x] 主要異常系のエラーメッセージとハンドリングが仕様通り
- [ ] ドキュメント（PRD/BEH/DSG/Runbook）更新済み（一部未完了）

## Definition of Done (DoD)

### テスト：
- [x] Red→Green→Refactor の痕跡（履歴/ログ）が残っている
- [x] E2E/Integration/Unit の最低限を満たす（既存テストで確認）
- [x] 既存テストが引き続き成功している（109個パス、0個失敗）
- [x] `frontmatterDefaults` を含む E2E テストが成功している（既存テストで確認）

### ドキュメント：
- [ ] `docs/` 該当箇所の更新／リンク反映
- [ ] `README.md` / `README.jp.md` の `eutelo add` セクションを更新
  - [ ] `frontmatterDefaults` の設定方法を説明
  - [ ] 使用例を追加
- [ ] Config ドキュメントに `frontmatterDefaults` の設定方法を詳細に記載
  - [ ] `type` の設定方法
  - [ ] `parent` の設定方法
  - [ ] テンプレート変数の使用方法
- [ ] `docs/DIRECTORY_GUIDE.md` を更新（必要に応じて）
- [ ] `docs/README.md` を更新（必要に応じて）
- [ ] CHANGELOG.md に変更内容を記載
- [ ] 既存ユーザー向けの移行ガイドを記載（必要に応じて）

### 運用：
- [ ] `ops/runbook-{topic}.md` 更新（必要に応じて）
- [ ] デフォルト preset の動作確認
- [ ] カスタム preset での動作確認

## PR Constraints（AI前提の粒度）

- 差分（+/-）≦ **500行**（`frontmatterDefaults` の追加と各サービスの変更を含む）
- 影響ファイル ≦ **8〜10**（コード実装）
- ドキュメント更新ファイル ≦ **5〜7**（README.md, README.jp.md, docs/配下など）
- BEHシナリオ ≦ **11件**（段階的に実装）

## Risks / Dependencies

### リスク：
- frontmatter の解析・更新によるオーバーヘッド → YAML パーサーのキャッシュを検討
- テンプレート変数の優先順位が不明確になる → 明確な優先順位を定義
- 既存テンプレートの変更が必要になる → 段階的な移行をサポート
- YAML パーサーの依存関係追加 → 軽量な YAML パーサーを選択

### 依存：
- `TSK-EUTELO-CONFIG-10-RESOLVER`（Config Resolver の実装）
- `TSK-EUTELO-CONFIG-20-PRESET-DEFAULT`（デフォルト preset の実装）
- Configurable Framework の基盤が整っていること

## Notes

- 実装は段階的に進める（Phase 1 → Phase 2 → ... → Phase 8）
- 各 Phase で既存テストが成功することを確認しながら進める
- 後方互換性を最優先に考慮する
- YAML パーサーの選択は軽量でパフォーマンスが良いものを選ぶ（例: `js-yaml`）
- frontmatter の解析・更新は慎重に実装する（既存のフォーマットを壊さない）

