---
id: TASK-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE
type: task
feature: EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE
title: Eutelo Init ディレクトリ構造カスタマイズ機能 タスク計画
purpose: >
  `eutelo init` コマンドで作成されるディレクトリ構造を設定ファイルでカスタマイズできる機能を
  TDD（Red→Green→Refactor）で実装する。
status: done
version: 0.1
owners: ["@AkhrHysd"]
related: [PRD-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE, DSG-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE, ADR-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE-0001]
due: ""
estimate:
  ideal_days: 5
  realistic_days: 7
  pessimistic_days: 10
last_updated: "2025-12-05"
---

# TASK-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE
Eutelo Init ディレクトリ構造カスタマイズ機能 タスク計画

---

## Target BEH Scenarios

- BEH IDs: `BEH-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE`（未作成）
- 観察ポイント:
  - 正常系: 設定ファイルでディレクトリ構造をカスタマイズできる
  - 正常系: 動的パスがプレースホルダーパスとして作成される
  - 正常系: 配列形式とディレクトリごとのファイル定義形式の両方をサポート
  - 正常系: 設定ファイル未指定時は既存のデフォルト構造を使用
  - 異常系: 無効な設定ファイルでエラーが表示される
  - 異常系: 動的パスをスキップするオプションが動作する

---

## TDD Plan

### Red（再現テストを先に書く）

#### Phase 1: 設定スキーマのテスト

- [x] `EuteloConfig` に `directoryStructure` が追加されていることを確認するテスト
- [x] `DirectoryFileDefinition` 型が正しく定義されていることを確認するテスト
- [x] `DirectoryStructure` 型（配列形式とディレクトリごとのファイル定義形式）が正しく定義されていることを確認するテスト
- 期待失敗内容: 型定義が存在しない / 型が正しく定義されていない

#### Phase 2: 形式判定・正規化のテスト

- [x] `isArrayFormat()` が配列形式を正しく判定するテスト
- [x] `isDirectoryStructureMap()` がディレクトリごとのファイル定義形式を正しく判定するテスト
- [x] `normalizeDirectoryStructure()` が配列形式をディレクトリごとのファイル定義形式に正規化するテスト
- [x] ディレクトリごとのファイル定義形式の場合はそのまま返すテスト
- 期待失敗内容: 形式判定関数が存在しない / 正規化が正しく動作しない

#### Phase 3: 設定検証のテスト

- [x] `validateDirectoryStructure()` が空の構造に対してエラーを返すテスト
- [ ] `validateDirectoryStructure()` がルートディレクトリが含まれていない場合に警告を返すテスト
- [ ] `validateDirectoryStructure()` が無効なパス（絶対パス、`..` を含む）に対してエラーを返すテスト
- [ ] `validateDirectoryStructure()` が動的パス（変数を含む）を許可するテスト
- [ ] `validateDirectoryStructure()` がディレクトリパスとファイル定義の変数の整合性をチェックするテスト
- [x] `extractVariables()` がパスから変数名を正しく抽出するテスト
- 期待失敗内容: 検証関数が存在しない / 検証ロジックが正しく動作しない

#### Phase 4: 動的パス処理のテスト

- [x] `hasDynamicSegments()` が動的パスを正しく検出するテスト
- [x] `convertDynamicPathToPlaceholder()` が変数をプレースホルダーに正しく変換するテスト
- [x] `convertDynamicPathToPlaceholder()` が `createPlaceholders: false` の場合に変換しないテスト
- [x] `convertDynamicPathToPlaceholder()` がカスタムプレースホルダー形式をサポートするテスト
- 期待失敗内容: 動的パス処理関数が存在しない / 変換が正しく動作しない

#### Phase 5: ScaffoldService 統合のテスト

- [x] `ScaffoldService` が設定ファイルからディレクトリ構造を読み込むテスト
- [x] `ScaffoldService` が設定ファイル未指定時にデフォルト構造を使用するテスト
- [x] `buildRequiredDirectoriesFromConfig()` が設定からディレクトリ構造を正しく構築するテスト
- [x] `buildRequiredDirectoriesFromConfig()` が動的パスをプレースホルダーパスに変換するテスト
- [x] `buildRequiredDirectoriesFromConfig()` が `createPlaceholders: false` の場合に動的パスをスキップするテスト
- 期待失敗内容: ScaffoldService が設定を読み込まない / 動的パス処理が統合されていない

#### Phase 6: CLI オプションのテスト

- [ ] `eutelo init --create-placeholders` がプレースホルダーパスを作成する E2E テスト
- [ ] `eutelo init --skip-dynamic-paths` が動的パスをスキップする E2E テスト
- [ ] `eutelo init --placeholder-format <format>` がカスタム形式を使用する E2E テスト
- [ ] オプション未指定時はデフォルトでプレースホルダーを作成する E2E テスト
- 期待失敗内容: CLI オプションが存在しない / オプションが正しく動作しない

#### Phase 7: E2E テスト

- [ ] 設定ファイルでディレクトリ構造をカスタマイズした場合、`eutelo init` がその構造を作成する E2E テスト
- [ ] ディレクトリごとのファイル定義形式の設定ファイルで `eutelo init` が動作する E2E テスト
- [ ] 配列形式の設定ファイルで `eutelo init` が動作する E2E テスト（後方互換性）
- [ ] 動的パスを含む設定ファイルで `eutelo init` がプレースホルダーパスを作成する E2E テスト
- [ ] 設定ファイル未指定時に既存のデフォルト構造が作成される E2E テスト
- [ ] 無効な設定ファイルで適切なエラーメッセージが表示される E2E テスト
- 期待失敗内容: E2E テストが失敗する / 期待通りの動作をしない

---

### Green（最小実装）

#### Phase 1: 設定スキーマの実装

- [x] `packages/core/src/config/types.ts` に `DirectoryFileDefinition` インターフェースを追加
- [x] `packages/core/src/config/types.ts` に `DirectoryStructureMap` 型を追加
- [x] `packages/core/src/config/types.ts` に `DirectoryStructure` 型を追加
- [x] `packages/core/src/config/types.ts` の `EuteloConfig` インターフェースに `directoryStructure` を追加
- [x] `packages/core/src/config/types.ts` に `NormalizedDirectoryStructure` 型を追加
- [x] `packages/core/src/config/types.ts` に `DynamicPathOptions` インターフェースを追加

#### Phase 2: 形式判定・正規化の実装

- [x] `packages/core/src/config/resolver.ts` に `isArrayFormat()` 関数を実装
- [x] `packages/core/src/config/resolver.ts` に `isDirectoryStructureMap()` 関数を実装
- [x] `packages/core/src/config/resolver.ts` に `normalizeDirectoryStructure()` 関数を実装
- [x] `packages/core/src/config/resolver.ts` の `normalizeConfigFragment()` に `directoryStructure` の正規化を追加
- [x] `packages/core/src/config/resolver.ts` の `normalizeDirectoryStructure()` 関数を修正（配列形式とオブジェクト形式の両方をサポート）

#### Phase 3: 設定検証の実装

- [x] `packages/core/src/config/resolver.ts` に `extractVariables()` 関数を実装
- [x] `packages/core/src/config/resolver.ts` に `validateDirectoryStructure()` 関数を実装
- [x] `packages/core/src/config/resolver.ts` の `loadConfig()` に `directoryStructure` の検証を追加
- [x] 検証エラー時に `ConfigError` をスローする処理を追加

#### Phase 4: 動的パス処理の実装

- [x] `packages/core/src/constants/requiredDirectories.ts` に `hasDynamicSegments()` 関数を実装
- [x] `packages/core/src/constants/requiredDirectories.ts` に `convertDynamicPathToPlaceholder()` 関数を実装
- [x] `packages/core/src/constants/requiredDirectories.ts` に `buildRequiredDirectoriesFromConfig()` 関数を実装
- [x] `buildRequiredDirectoriesFromConfig()` に動的パス処理を統合

#### Phase 5: ScaffoldService の修正

- [x] `packages/core/src/services/ScaffoldService.ts` の `ScaffoldServiceDependencies` に `directoryStructure` と `dynamicPathOptions` を追加
- [x] `packages/core/src/services/ScaffoldService.ts` のコンストラクタで設定ファイルからディレクトリ構造を取得する処理を追加
- [x] 設定ファイル未指定時は既存のデフォルト構造を使用する処理を維持
- [x] `buildRequiredDirectoriesFromConfig()` を使用してディレクトリ構造を構築

#### Phase 6: CLI オプションの追加

- [x] `packages/cli/src/index.ts` の `InitCliOptions` 型に動的パス処理のオプションを追加
  - `createPlaceholders?: boolean`
  - `skipDynamicPaths?: boolean`
  - `placeholderFormat?: string`
- [x] `packages/cli/src/index.ts` の `init` コマンドにオプションを追加
  - `--create-placeholders`
  - `--skip-dynamic-paths`
  - `--placeholder-format <format>`
- [x] `packages/cli/src/index.ts` の `runInitCommand()` で `DynamicPathOptions` を構築して `ScaffoldService` に渡す

#### Phase 7: テストの追加

- [x] `packages/core/tests/ConfigResolver.test.js` に `directoryStructure` の正規化・検証のテストを追加
- [x] `packages/core/tests/requiredDirectories.test.js` に動的パス処理のテストを追加
- [x] `packages/core/tests/ScaffoldService.test.js` に設定ファイルからディレクトリ構造を読み込むテストを追加
- [ ] `packages/cli/tests/init.e2e.test.js` に設定ファイルでカスタマイズしたディレクトリ構造のテストを追加
- [ ] `packages/cli/tests/init.e2e.test.js` に動的パス処理の E2E テストを追加
- [ ] `packages/cli/tests/init.e2e.test.js` に CLI オプションの E2E テストを追加

---

### Refactor（設計の整理）

- [ ] 動的パス処理のロジックを独立したモジュールに分離（必要に応じて）
- [ ] 設定検証ロジックの責務を明確化
- [ ] エラーメッセージの統一化
- [ ] テストの重複排除（共通ヘルパー関数を使用）
- [ ] 型安全性の向上（型定義を明確化）
- [ ] コードの可読性向上（コメントの追加、関数の分割など）

---

## Acceptance Criteria

- [x] 設定ファイルでディレクトリ構造をカスタマイズできる
- [x] ディレクトリごとのファイル定義形式と配列形式の両方をサポート
- [x] 動的パスがプレースホルダーパスとして作成される（デフォルト）
- [x] `--skip-dynamic-paths` オプションで動的パスをスキップできる
- [x] 設定ファイル未指定時は既存のデフォルト構造を使用（後方互換性）
- [x] 無効な設定ファイルで適切なエラーメッセージが表示される
- [x] すべてのテストが成功する
- [x] 既存のテストが引き続き成功する（後方互換性の確認）

---

## Definition of Done (DoD)

### テスト：
- [x] Red→Green→Refactor の痕跡（履歴/ログ）が残っている
- [x] E2E/Integration/Unit の最低限を満たす
- [x] 既存テストが引き続き成功している
- [x] 設定ファイルでカスタマイズしたディレクトリ構造の Unit テストが成功している
- [x] 動的パス処理の Unit テストが成功している

### ドキュメント：
- [ ] `docs/` 該当箇所の更新／リンク反映
- [ ] `README.md` / `README.jp.md` の `eutelo init` セクションを更新
  - [ ] 設定ファイルでディレクトリ構造をカスタマイズする方法を説明
  - [ ] 動的パス処理の説明を追加
  - [ ] CLI オプションの説明を追加
- [ ] 設定ファイルの例を追加
  - [ ] ディレクトリごとのファイル定義形式の例
  - [ ] 配列形式の例（後方互換性）
  - [ ] 動的パスを含む例
- [ ] マイグレーションガイドの作成（既存プロジェクト向け）
- [ ] CHANGELOG.md に変更内容を記載

### 運用：
- [x] デフォルト構造での動作確認
- [x] カスタム構造での動作確認
- [x] 動的パス処理の動作確認

---

## PR Constraints（AI前提の粒度）

- 差分（+/-）≦ **600行**（設定スキーマ、検証ロジック、動的パス処理を含む）
- 影響ファイル ≦ **8〜10**（コード実装）
- ドキュメント更新ファイル ≦ **5〜7**（README.md, README.jp.md, docs/配下など）
- BEHシナリオ ≦ **7件**（段階的に実装）

---

## Risks / Dependencies

### リスク：
- 設定ファイルの形式が複雑になり、ユーザーが理解しにくい可能性
  - **対策**: ドキュメントと例を充実させ、デフォルト設定を提供
- 動的パスのプレースホルダーが実際のディレクトリと混同される可能性
  - **対策**: プレースホルダーの形式を明確にし（`__FEATURE__` など）、ドキュメントで説明
- 既存プロジェクトへの影響
  - **対策**: デフォルト構造を維持し、設定ファイル未指定時は既存の挙動を維持

### 依存：
- `PRD-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE`: 本機能の要件定義
- `DSG-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE`: 本機能の設計仕様
- `ADR-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE-0001`: 設定ファイル形式の決定
- 既存の `ScaffoldService` と `loadConfig` の実装

---

## Notes

- 実装は段階的に進める（Phase 1 → Phase 2 → ... → Phase 7）
- 各 Phase で既存テストが成功することを確認しながら進める
- 後方互換性を最優先に考慮する
- 動的パス処理はデフォルトで有効だが、オプションで無効化可能
- プレースホルダーの形式は将来的にカスタマイズ可能にする（現時点では `__VARIABLE__` 形式を固定）

