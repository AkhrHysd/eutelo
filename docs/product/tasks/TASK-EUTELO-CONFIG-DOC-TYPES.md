---
id: TASK-EUTELO-CONFIG-DOC-TYPES
type: task
feature: EUTELO-CONFIG-DOC-TYPES
title: Eutelo Config Doc Types タスク計画
purpose: >
  BEH シナリオを TDD（Red→Green→Refactor）で満たし、
  DocumentType を設定駆動化してコアコードからハードコードを排除する。
status: red
version: 0.1.0
owners: ["@team-eutelo"]
related: [PRD-EUTELO-CONFIG-DOC-TYPES, BEH-EUTELO-CONFIG-DOC-TYPES, DSG-EUTELO-CONFIG-DOC-TYPES]
due: ""
estimate:
  ideal_days: 5
  realistic_days: 7
  pessimistic_days: 10
last_updated: "2025-11-22"
---

# TASK-EUTELO-CONFIG-DOC-TYPES

## Target BEH Scenarios

- BEH IDs: `BEH-EUTELO-CONFIG-DOC-TYPES / DOC-TYPE-S1, DOC-TYPE-S2, DOC-TYPE-S3, DOC-TYPE-S4, DOC-TYPE-S5, DOC-TYPE-S6, DOC-TYPE-S7, DOC-TYPE-S8, DOC-TYPE-S9, DOC-TYPE-S10`
- 観察ポイント: 正常系S-1/S-3/S-4/S-7/S-8/S-9/S-10、異常系S-2/S-5、統合系S-6

## TDD Plan

### Red（再現テストを先に書く）

#### Phase 1: DocumentType Registry のテスト

- [x] `DocumentTypeRegistry.getDocumentTypes()` が Config から DocumentType 一覧を返すテスト
- [x] `DocumentTypeRegistry.hasDocumentType()` が正しく判定するテスト
- [x] `DocumentTypeRegistry.getScaffoldConfig()` が scaffold エントリを返すテスト
- [x] `DocumentTypeRegistry.getFrontmatterSchema()` が schema を返すテスト
- [x] 未登録 DocumentType に対して `undefined` を返すテスト
- 期待失敗内容: DocumentTypeRegistry クラスが存在しない / Config から DocumentType を抽出できない

#### Phase 2: AddDocumentService の変更テスト

- [x] `getBlueprint()` が Config から scaffold エントリを検索するテスト
- [x] `kind` でマッチングするテスト
- [x] `scaffoldId` で直接指定するテスト
- [x] 未登録 DocumentType に対して `DocumentTypeNotFoundError` をスローするテスト
- [x] エラーメッセージに利用可能な DocumentType 一覧が含まれるテスト
- 期待失敗内容: `getBlueprint()` が Config を参照していない / エラーハンドリングが不適切

#### Phase 3: CLI コマンド動的生成のテスト

- [ ] Config 解決後に scaffold エントリから CLI サブコマンドを動的生成するテスト
- [ ] `eutelo add <type> <feature>` 形式でコマンドが生成されるテスト
- [ ] `eutelo add --help` で利用可能な種別が表示されるテスト
- [ ] 未登録 DocumentType でエラーが表示されるテスト
- 期待失敗内容: CLI コマンドが固定されている / 動的生成が機能しない

#### Phase 4: ValidationService の変更テスト

- [ ] Config から解決された DocumentType の schema を適用するテスト
- [ ] 未登録 DocumentType に対して警告を出力するテスト
- [ ] 警告のみで exit code が 0 のままのテスト
- 期待失敗内容: 未登録 DocumentType が無視される / エラーになる

#### Phase 5: GraphService の変更テスト

- [ ] Config から解決された DocumentType のみを Graph に含めるテスト
- [ ] 未登録 DocumentType のドキュメントを警告として記録するテスト
- 期待失敗内容: 未登録 DocumentType が Graph に含まれる / 警告が記録されない

#### Phase 6: E2E テスト

- [ ] カスタム DocumentType を含む config で `eutelo add <custom-type>` が動作する E2E テスト
- [ ] デフォルト preset で既存コマンドが動作する E2E テスト
- [ ] 未登録 DocumentType でエラーが表示される E2E テスト
- 期待失敗内容: E2E テストが失敗する / 期待通りの動作をしない

### Green（最小実装）

#### Phase 1: DocumentType Registry の実装

- [x] `packages/core/src/config/DocumentTypeRegistry.ts` を作成
- [x] `EuteloConfigResolved` から DocumentType 一覧を抽出するロジックを実装
- [x] `scaffold` エントリの `kind` を DocumentType として扱う
- [x] `getDocumentTypes()`, `hasDocumentType()`, `getScaffoldConfig()`, `getFrontmatterSchema()` メソッドを実装
- [x] ConfigResolver に統合（または独立したサービスとして提供）

#### Phase 2: AddDocumentService の変更

- [x] `getBlueprint()` メソッドを変更して Config から scaffold エントリを検索
- [x] `kind` または `scaffoldId` でマッチングするロジックを実装
- [x] `DocumentTypeNotFoundError` クラスを作成
- [x] エラーメッセージに利用可能な DocumentType 一覧を含める
- [x] 既存のテストが引き続き成功することを確認

#### Phase 3: CLI コマンド動的生成の実装

- [x] `packages/cli/src/index.ts` の `add` コマンド定義を変更
- [x] Config 解決後に scaffold エントリを走査してサブコマンドを動的生成
- [x] 既存の固定コマンド（`prd`, `beh`, `dsg` など）との互換性を維持
- [x] `--help` で利用可能な種別が表示されるようにする
- [x] エラーハンドリングを追加（未登録 DocumentType の場合）

#### Phase 4: ValidationService の変更

- [x] `packages/core/src/services/ValidationService.ts` を変更
- [x] Config から解決された DocumentType のみを許可するロジックを追加
- [x] 未登録 DocumentType に対して警告を出力するロジックを追加
- [x] 警告のみで exit code が 0 のままになるようにする

#### Phase 5: GraphService の変更

- [x] `packages/core/src/graph/DocumentScanner.ts` を変更
- [x] Config から解決された DocumentType のみを Graph に含めるロジックを追加
- [x] 未登録 DocumentType のドキュメントを警告として記録するロジックを追加

#### Phase 6: エラーハンドリングの改善

- [x] `DocumentTypeNotFoundError` のメッセージを改善
- [x] CLI 側でエラーメッセージを適切に表示
- [x] 利用可能な DocumentType 一覧を表示するヘルパー関数を追加

#### Phase 7: ドキュメント更新

- [x] `README.md` の `eutelo add` セクションにカスタムDocumentTypeの説明を追加
  - [x] カスタムDocumentTypeの追加方法を説明
  - [x] `eutelo add <custom-type>` の使用例を追加
  - [x] Config で定義された DocumentType が自動的に CLI コマンドとして利用可能になることを説明
- [x] `README.jp.md` の `eutelo add` セクションに同様の内容を日本語で追加
- [x] Config ドキュメント（`docs/` 配下）に DocumentType 追加手順を詳細に記載
  - [x] テンプレートファイルの作成方法
  - [x] `eutelo.config.ts` での scaffold エントリの定義方法
  - [x] frontmatter schema の定義方法
  - [x] 3ステップ以内での追加手順を明記
- [x] `docs/DIRECTORY_GUIDE.md` を更新（必要に応じて）
  - [x] カスタムDocumentTypeのディレクトリ配置例を追加
- [x] `docs/README.md` を更新（必要に応じて）
  - [x] DocumentType拡張機能への言及を追加
- [x] CHANGELOG.md に変更内容を記載
  - [x] DocumentType拡張機能の追加を記載
  - [x] 後方互換性の維持を明記

### Refactor（設計の整理）

- [ ] DocumentType Registry の責務を明確化
- [ ] Config 解決と DocumentType 抽出の責務分離
- [ ] CLI コマンド生成ロジックの共通化
- [ ] エラーメッセージの統一化
- [ ] テストの重複排除
- [ ] 型安全性の向上（`keyof scaffold` の活用）

## Acceptance Criteria

- [ ] 対象BEHシナリオが自動テストで再現・合格
- [ ] Config から解決された DocumentType が CLI で利用できる
- [ ] 未登録 DocumentType に対して適切なエラーが表示される
- [ ] デフォルト preset で既存コマンドが動作する（後方互換性）
- [ ] Validation/Graph/Guard が Config から解決された DocumentType を認識する
- [ ] 新種別追加に必要な作業が「config とテンプレートの定義」のみに限定される
- [ ] 主要異常系のエラーメッセージとハンドリングが仕様通り
- [ ] ドキュメント（PRD/BEH/DSG/Runbook）更新済み

## Definition of Done (DoD)

### テスト：
- [ ] Red→Green→Refactor の痕跡（履歴/ログ）が残っている
- [ ] E2E/Integration/Unit の最低限を満たす
- [ ] 既存テストが引き続き成功している
- [ ] カスタム DocumentType を含む E2E テストが成功している

### ドキュメント：
- [ ] `docs/` 該当箇所の更新／リンク反映
- [ ] `README.md` / `README.jp.md` の `eutelo add` セクションを更新
  - [ ] カスタムDocumentTypeの追加方法を説明
  - [ ] 使用例を追加
- [ ] Config ドキュメントに DocumentType 追加手順を詳細に記載
  - [ ] テンプレート作成手順
  - [ ] Config 定義手順
  - [ ] frontmatter schema 定義手順
  - [ ] 3ステップ以内での追加手順を明記
- [ ] `docs/DIRECTORY_GUIDE.md` を更新（カスタムDocumentTypeの配置例）
- [ ] `docs/README.md` を更新（DocumentType拡張機能への言及）
- [ ] CHANGELOG.md に変更内容を記載
- [ ] 既存ユーザー向けの移行ガイドを記載（必要に応じて）

### 運用：
- [ ] `ops/runbook-{topic}.md` 更新（必要に応じて）
- [ ] デフォルト preset の動作確認
- [ ] カスタム preset での動作確認

## PR Constraints（AI前提の粒度）

- 差分（+/-）≦ **500行**（DocumentType Registry の追加を含む）
- 影響ファイル ≦ **8〜10**（コード実装）
- ドキュメント更新ファイル ≦ **5〜7**（README.md, README.jp.md, docs/配下など）
- BEHシナリオ ≦ **10件**（段階的に実装）

## Risks / Dependencies

### リスク：
- CLI コマンド体系の変更による既存ユーザーの混乱 → 後方互換性を維持し、段階的な移行をサポート
- 型安全性低下リスク → Config から型推論を活用し、型生成ツールを検討
- テストケースの爆発 → preset fixture を使ったパラメトリックなテスト戦略を採用

### 依存：
- `TSK-EUTELO-CONFIG-10-RESOLVER`（Config Resolver の実装）
- `TSK-EUTELO-CONFIG-20-PRESET-DEFAULT`（デフォルト preset の実装）
- Configurable Framework の基盤が整っていること

## Notes

- 実装は段階的に進める（Phase 1 → Phase 2 → ... → Phase 6）
- 各 Phase で既存テストが成功することを確認しながら進める
- 後方互換性を最優先に考慮する
- CLI UI/UX の再設計（サブコマンド vs 引数）は別途検討が必要な場合は BEH/TASK を追加

