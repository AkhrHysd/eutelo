---
id: TASK-EUTELO-RELEASE-FLOW
type: task
feature: EUTELO-RELEASE-FLOW
title: EUTELO-RELEASE-FLOW タスク計画
purpose: >
  EUTELO-RELEASE-FLOW の BEH シナリオを TDD（Red→Green→Refactor）で満たす。
status: red
version: 0.1.0
owners: ["@team-eutelo-core"]
related: [PRD-EUTELO-RELEASE-FLOW, DSG-EUTELO-RELEASE-FLOW]
due: ""
estimate:
  ideal_days: 10
  realistic_days: 15
  pessimistic_days: 20
last_updated: "2025-11-22"
---

# TASK-EUTELO-RELEASE-FLOW

## Target BEH Scenarios
- BEH IDs: `RELEASE-FLOW-S1`（正常系: タグトリガー）、`RELEASE-FLOW-S2`（異常系: プレフライト失敗）、`RELEASE-FLOW-S3`（異常系: publish 途中失敗）
- 観察ポイント: リリースフローの各ステップが正常に実行され、失敗時は適切にロールバック・通知される

## TDD Plan

### Red（再現テストを先に書く）
- [ ] リリーストリガー検知のテスト（タグイベントの検証）
- [ ] プレフライトチェックのテスト（build/test/guard 失敗時の検証）
- [ ] バージョン整合性検証のテスト（SemVer 違反・依存不一致の検出）
- [ ] 依存関係置換のテスト（`file:` → semver の置換と復元）
- [ ] 順序付き公開のテスト（依存順序の遵守、途中失敗時のスキップ）
- [ ] リリースノート生成のテスト（CHANGELOG 抽出、Git タグ作成）
- [ ] ポスト検証のテスト（インストール成功確認）
- [ ] 監査証跡のテスト（ログ・通知の記録）
- 期待失敗内容: 各ステップが未実装のため、テストが失敗する

### Green（最小実装）
- [ ] リリーストリガー検知モジュールの実装（GitHub Actions ワークフロー）
- [ ] プレフライト検証モジュールの実装（`npm ci/build/test/guard` の実行）
- [ ] バージョン整合性検証モジュールの実装（SemVer 検証、依存整合チェック）
- [ ] 依存関係置換モジュールの実装（`file:` → semver 置換・復元）
- [ ] 順序付き公開モジュールの実装（依存順序に従った publish）
- [ ] リリースノート生成モジュールの実装（CHANGELOG 抽出、Release ノート生成）
- [ ] ポスト検証モジュールの実装（`npm install` 検証）
- [ ] 監査証跡モジュールの実装（ログ保存、通知送信）
- [ ] テストを通すための最小変更のみ実施

### Refactor（設計の整理）
- [ ] モジュール間の責務分離を整理（重複排除）
- [ ] エラーハンドリングの統一（エラーメッセージ、ログ形式）
- [ ] 設定の外部化（公開順序、dist-tag の設定を設定ファイルに）
- [ ] テストは常にグリーン維持

## Acceptance Criteria
- [ ] 対象 BEH シナリオが自動テストで再現・合格
  - `RELEASE-FLOW-S1`: タグトリガーでリリースが正常に完了
  - `RELEASE-FLOW-S2`: プレフライト失敗時にリリースが中断され、エラー通知が送信される
  - `RELEASE-FLOW-S3`: publish 途中失敗時に以降のパッケージがスキップされ、ロールバック手順が提示される
- [ ] 主要異常系のエラーメッセージとハンドリングが仕様通り
  - バージョン不一致エラー、依存関係エラー、publish 失敗エラー
- [ ] ドキュメント（PRD/BEH/DSG/Runbook）更新済み
  - `docs/ops/runbook-eutelo-release-flow.md` の作成・更新

## Definition of Done (DoD)

### テスト
- [ ] Red→Green→Refactor の痕跡（履歴/ログ）が残っている
- [ ] E2E/Integration/Unit の最低限を満たす
  - E2E: GitHub Actions ワークフローの実行テスト（dry-run モード）
  - Integration: 各モジュールの連携テスト
  - Unit: 各モジュールの単体テスト

### ドキュメント
- [ ] `docs/` 該当箇所の更新／リンク反映
  - `DSG-EUTELO-RELEASE-FLOW.md` の完成
  - `docs/ops/runbook-eutelo-release-flow.md` の作成

### 運用
- [ ] `ops/runbook-eutelo-release-flow.md` 更新（必要に応じて）
  - リリース手順、失敗時の対応手順、通知設定

## 実装タスク詳細

### Phase 1: 基盤整備
- [ ] GitHub Actions ワークフローファイルの作成（`.github/workflows/release.yml`）
- [ ] リリーススクリプトのディレクトリ構造を決定（`scripts/release/` または `packages/release/`）
- [ ] npm automation token と OIDC 設定の確認・設定

### Phase 2: トリガー検知
- [ ] タグトリガーの実装（`v*.*.*` パターンの検知）
- [ ] バージョン抽出ロジック（タグからバージョン番号を取得）

### Phase 3: プレフライト検証
- [ ] `npm ci` 実行モジュール
- [ ] `npm run build` 実行モジュール
- [ ] `npm test` 実行モジュール
- [ ] `npx eutelo guard --ci --json --fail-on-error` 実行モジュール
- [ ] 失敗時のエラーハンドリングと通知

### Phase 4: バージョン整合性検証
- [ ] SemVer 形式検証モジュール
- [ ] 内部依存バージョン整合性チェックモジュール
- [ ] CHANGELOG と `package.json` のバージョン一致チェック
- [ ] 検証結果レポート生成

### Phase 5: 依存関係置換
- [ ] `file:` 依存の検出モジュール
- [ ] semver への置換モジュール（バックアップ保存）
- [ ] 復元モジュール（publish 後の `file:` 参照への復元）
- [ ] 置換ログの記録

### Phase 6: 順序付き公開
- [ ] 公開順序定義（設定ファイル化）
- [ ] 順次 publish 実行モジュール（`npm publish --provenance --access public --tag {dist-tag}`）
- [ ] 途中失敗時のスキップ処理
- [ ] 成功済みパッケージの記録

### Phase 7: リリースノート生成
- [ ] CHANGELOG 抽出モジュール（該当バージョンの変更点を抽出）
- [ ] GitHub Release ノート生成モジュール（PR/ADR/Issue リンクを含む）
- [ ] Git タグ作成モジュール（`v{package}@{version}` 形式）

### Phase 8: ポスト検証
- [ ] `npm view` によるバージョン確認モジュール
- [ ] `npm install` によるインストール検証モジュール
- [ ] メタパッケージ動作確認モジュール
- [ ] 失敗時の dist-tag 切替手順提示

### Phase 9: 監査証跡
- [ ] 公開日時・コミット SHA・CI ジョブ URL の記録
- [ ] provenance URL の取得・記録
- [ ] アーティファクト保存（JSON 形式）
- [ ] Slack/メール通知モジュール

### Phase 10: dry-run / RC サポート
- [ ] `--dry-run` モードの実装（`npm pack` のみ実行）
- [ ] `--tag next` による RC 配布の実装
- [ ] RC チャネルの検証フロー

## PR Constraints（AI前提の粒度）
- 差分（+/-）≦ **300行**（各 Phase ごと）
- 影響ファイル ≦ **5〜7**（各 Phase ごと）
- BEHシナリオ ≦ **3件**（正常系 1、異常系 2）

## Risks / Dependencies
- リスク：
  - npm 側の障害で publish が遅延する可能性（dist-tag で切り替える fallback を前提）
  - provenance 署名対応の npm Token/OIDC 設定が Runner で利用できない環境では手動対応が必要
  - 依存置換スクリプトの失敗によりバージョン齟齬が起きるリスク（事前に dry-run / pack で検証する）
- 依存：
  - `PRD-EUTELO-GOVERNANCE`
  - `ADR-0105-PublishingPolicy`
  - `ADR-0106-VersioningPolicy`
  - `DSG-EUTELO-CORE-DISTRIBUTION`（公開アーキテクチャの詳細が前提）
  - `docs/ops/runbook-eutelo-cli-ci.md`（既存 CI 運用の参考）

## Notes
- バージョン PR の生成方式は未確定（Changesets 導入の検討が必要）
- リリースノート自動生成のフォーマットは CHANGELOG ベースを初期実装とし、後続で拡張
- RC の評価対象プロジェクトは Dento を初期対象とし、後続で拡充
