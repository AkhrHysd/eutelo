---
id: TASK-EUTELO-CONFIG-ADD-DIRECTORY-STRUCTURE-INTEGRATION
type: task
feature: EUTELO-CONFIG-ADD-DIRECTORY-STRUCTURE-INTEGRATION
title: directoryStructure 統一と scaffold 非推奨化 タスク計画
purpose: >
  directoryStructure を scaffold の代替として機能させ、設定を一元化する。
  TDD（Red→Green→Refactor）で実装する。
status: done
version: 0.1
owners: ["@team-eutelo"]
related: [PRD-EUTELO-CONFIG-ADD-DIRECTORY-STRUCTURE-INTEGRATION, PRD-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE]
due: ""
estimate:
  ideal_days: 3
  realistic_days: 5
  pessimistic_days: 7
last_updated: "2025-12-05"
---

# TASK-EUTELO-CONFIG-ADD-DIRECTORY-STRUCTURE-INTEGRATION
directoryStructure 統一と scaffold 非推奨化 タスク計画

---

## Target BEH Scenarios

- 観察ポイント:
  - 正常系: `directoryStructure` のファイル定義から `eutelo add` でドキュメントを生成できる
  - 正常系: `kind` が明示されていない場合、prefix またはファイル名から推定される
  - 正常系: `frontmatterDefaults` が正しくテンプレートに反映される
  - 正常系: preset-default が `directoryStructure` 形式で動作する
  - 異常系: 無効な `directoryStructure` 設定でエラーが表示される

---

## TDD Plan

### Phase 1: DirectoryFileDefinition 型拡張

#### Red（テストを先に書く）

- [ ] `DirectoryFileDefinition` に `kind` フィールドが追加されていることを確認するテスト
- [ ] `DirectoryFileDefinition` に `frontmatterDefaults` フィールドが追加されていることを確認するテスト

#### Green（実装）

- [ ] `packages/core/src/config/types.ts` に `kind`, `frontmatterDefaults` を追加

#### Refactor

- [ ] 型定義の整理

---

### Phase 2: directoryStructure → scaffold 変換ロジック

#### Red

- [ ] `convertDirectoryStructureToScaffold()` が `DirectoryFileDefinition` を `ScaffoldTemplateConfig` に変換するテスト
- [ ] `kind` が明示されている場合、そのまま使用されるテスト
- [ ] `kind` が未指定で `prefix` がある場合、prefix から推定されるテスト
- [ ] `kind` が未指定で `prefix` がない場合、ファイル名から推定されるテスト
- [ ] `frontmatterDefaults` が正しく変換されるテスト
- [ ] ディレクトリパスとファイル名が結合されて `path` になるテスト

#### Green

- [ ] `packages/core/src/config/resolver.ts` に変換関数を実装
- [ ] `inferKindFromFileDef()` 関数を実装

#### Refactor

- [ ] 変換ロジックの整理

---

### Phase 3: 設定マージ処理

#### Red

- [ ] `loadConfig` が `directoryStructure` から scaffold を生成するテスト
- [ ] `directoryStructure` 由来の scaffold と明示的な `scaffold` がマージされるテスト
- [ ] 同じ `kind` が両方にある場合、`directoryStructure` が優先されるテスト
- [ ] `directoryStructure` のみの設定で `add` コマンドが動作するテスト

#### Green

- [ ] `mergeDirectoryStructureIntoScaffold()` を実装
- [ ] `loadConfig` / `resolveConfig` に統合

#### Refactor

- [ ] マージロジックの整理

---

### Phase 4: AddDocumentService 統合確認

#### Red

- [ ] `AddDocumentService` が変換後の scaffold を使用するテスト
- [ ] `directoryStructure` で定義された `kind` で `addDocument` が成功するテスト
- [ ] `frontmatterDefaults` が生成されたドキュメントに反映されるテスト
- [ ] シーケンス番号（`{SEQUENCE}`）が正しく処理されるテスト

#### Green

- [ ] 必要に応じて `AddDocumentService` を修正（変更は最小限の見込み）

#### Refactor

- [ ] テストの整理

---

### Phase 5: preset-default 移行

#### Red

- [ ] `@eutelo/preset-default` が `directoryStructure` を含むテスト
- [ ] preset-default の `directoryStructure` で `eutelo add prd` が動作するテスト
- [ ] preset-default の `directoryStructure` で `eutelo add beh` が動作するテスト
- [ ] preset-default の `directoryStructure` で `eutelo add dsg` が動作するテスト
- [ ] preset-default の `directoryStructure` で `eutelo add adr` が動作するテスト
- [ ] preset-default の `directoryStructure` で `eutelo add task` が動作するテスト
- [ ] preset-default の `directoryStructure` で `eutelo add ops` が動作するテスト

#### Green

- [ ] `packages/preset-default/src/index.ts` を `directoryStructure` 形式に書き換え
- [ ] `scaffold` 設定を削除（または非推奨コメント付きで残す）

#### Refactor

- [ ] preset-default のコード整理

---

### Phase 6: E2E テスト

#### Red

- [ ] カスタム `directoryStructure` で `eutelo add` が動作する E2E テスト
- [ ] `directoryStructure` で定義された `kind` が `eutelo add` のサブコマンドとして使用できる E2E テスト
- [ ] `eutelo init` + `eutelo add` の連携 E2E テスト
- [ ] 無効な `directoryStructure` で適切なエラーメッセージが表示される E2E テスト

#### Green

- [ ] E2E テストがパスするように実装を調整

#### Refactor

- [ ] テストの整理

---

### Phase 7: ドキュメント更新

- [ ] README.md / README.jp.md の更新（`directoryStructure` 統一の説明）
- [ ] `scaffold` 非推奨の記載
- [ ] マイグレーションガイドの作成
- [ ] CHANGELOG.md の更新

---

## Implementation Order

1. **Phase 1**: 型定義の拡張
2. **Phase 2**: 変換ロジック実装
3. **Phase 3**: 設定マージ処理
4. **Phase 4**: AddDocumentService 統合確認
5. **Phase 5**: preset-default 移行
6. **Phase 6**: E2E テスト
7. **Phase 7**: ドキュメント更新

---

## Acceptance Criteria

- [ ] `directoryStructure` のファイル定義から `eutelo add` でドキュメントを生成できる
- [ ] `kind` が明示されていない場合、prefix またはファイル名から推定される
- [ ] `frontmatterDefaults` が正しく反映される
- [ ] `@eutelo/preset-default` が `directoryStructure` 形式で定義されている
- [ ] 既存のテストがすべてパスする
- [ ] 新規テストがすべてパスする
- [ ] ドキュメントが更新されている

---

## Definition of Done

- [ ] Phase 1-6 のすべてのテストがパス
- [ ] `npm run build` が成功
- [ ] `npm test` が成功
- [ ] README.md / README.jp.md が更新
- [ ] CHANGELOG.md が更新
- [ ] マイグレーションガイドが作成

---

## Notes

- `scaffold` 設定は Phase 5 で preset-default から削除するが、コアの型定義は残す（後方互換）
- 将来的な `scaffold` 完全削除は別タスクで対応
- シーケンス番号の処理（`{SEQUENCE}`）は既存の `AddDocumentService` のロジックを再利用

