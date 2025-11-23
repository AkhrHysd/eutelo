---
id: PRD-EUTELO-RELEASE-FLOW
type: prd
feature: EUTELO-RELEASE-FLOW
title: @eutelo npm パッケージのリリースフロー PRD
purpose: >
  @eutelo スコープの npm パッケージを安全かつ再現性高く公開する標準フローを整備し、
  外部利用者に対する後方互換性と透明性を保証する。
status: draft
version: 0.1
parent: PRD-EUTELO-GOVERNANCE
owners: ["@team-eutelo-core"]
tags: ["release", "npm", "ci", "automation", "governance"]
last_updated: "2025-11-22"
---

# PRD-EUTELO-RELEASE-FLOW

## 1. Background
- `@eutelo/*` には core / infrastructure / distribution / preset-default / commander / cli / meta / lint plugin など複数パッケージが存在し、公開順序・依存関係を意識したリリースが必要。
- 現状はスクリプト `publish:*` に依存する手動オペレーションが中心で、SemVer 違反や changelog 抜け、 provenance なし公開のリスクがある。
- Public Registry への配布を前提とするため、**後方互換・透明性・再現性** を満たす標準化されたリリースフローが必須。

## 2. Goals / KPI
- CI だけでリリース可能な **ワンパスフロー**（手動操作はバージョン確定と承認のみ）
- 公開された全パッケージが **provenance 付き / public access** で npm に到達する成功率 100%
- バージョン確定から publish 完了までのリードタイム **< 60 分**
- リリース失敗率 **< 2%**（再実行で復旧可能）
- 各リリースで changelog・Git タグ・リリースノートが揃う遵守率 100%

## 3. Scope
### In Scope
- main ブランチからの **CI 駆動リリース**（tag または release branch/PR で発火）
- SemVer 準拠のバージョン確定と **依存パッケージ間のバージョン整合**（file: → semver 置換を含む）
- `npm ci → build → test → guard → publish` の **必須ゲート** と公開順序制御
- `npm publish --provenance --access public` による署名付き配布と `latest/next` の dist-tag 運用
- 各パッケージの CHANGELOG / GitHub Release ノート自動生成と配布アーティファクト（tgz, SBOM）の保存
- 失敗時の自動ロールバック方針（publish 失敗 → dist-tag/再試行、成功済み部分は手動 deprecate で扱う）
- dry-run（pack のみ）と release candidate チャネルの提供

### Out of Scope
- npm 以外のレジストリ配布（GitHub Packages はミラー扱いに留める）
- 完全自動バージョニング（人手承認なしの version bump は対象外）
- SaaS 提供・課金まわりの運用

## 4. User Stories
- Maintainer として、バージョン確定 PR をマージすると CI が自動で publish し、公開結果とノートが通知される。
- 開発者として、`next` dist-tag で RC を取得し、本番影響を与えずに検証できる。
- SRE として、失敗時にどのステップで止まったか・何が publish 済みかを即座に把握し、再実行手順が明確に分かる。

## 5. Functional Requirements (FR)
- **FR-01 トリガー**: `vX.Y.Z` タグ または `release/*` ブランチ/PR マージでリリースジョブを起動できる。
- **FR-02 プレフライト**: `npm ci && npm run build && npm test && npx eutelo guard --ci --json --fail-on-error` を満たさない限り publish を実行しない。
- **FR-03 バージョン整合**: すべての publish 対象パッケージが SemVer を遵守し、依存する内部パッケージのバージョンが揃っているか自動検証する。
- **FR-04 公開順序**: core → infrastructure → distribution → preset-default → commander → cli → meta（eutelo）→ lint plugin の順序で publish し、途中失敗時は以降をスキップする。
- **FR-05 依存置換**: publish 前に `file:` 依存を semver に置換し、publish 後はローカル参照へ戻す（変換ログを残す）。
- **FR-06 リリースノート**: 各パッケージの CHANGELOG 更新と Git タグに紐づく Release ノートを生成し、PR/ADR/Issue へのリンクを含める。
- **FR-07 dry-run / RC**: `--dry-run` で `npm pack` を実行し publish しないモード、および `--tag next` による RC 配布をサポートする。
- **FR-08 監査証跡**: 公開日時・コミット SHA・CI ジョブ URL・発行 dist-tag・provenance URL をログ/アーティファクトに保存し、Slack/メールへ通知できる。
- **FR-09 ポスト検証**: publish 後に `npm view` / `npm install @eutelo/cli@latest` などのインストール検証を自動実行し、失敗時は dist-tag を最新から外す手順を提示する。

## 6. Non-Functional Requirements (NFR)
- **NFR-01 パイプライン時間**: CI のリリースジョブは 15 分以内を目標（ビルド+テスト+guard 含む）。
- **NFR-02 再現性**: lockfile 固定・ビルド出力のハッシュ検証・`npm publish --provenance` により、どの環境でも同一成果物を得られる。
- **NFR-03 セキュリティ**: npm Token は OIDC + npm automation token を使用し、Secrets を Runner に長期保存しない。
- **NFR-04 可観測性**: 失敗時はステップ別の原因（test/guard/publish など）をメトリクス化し、アラートを送る。
- **NFR-05 互換性**: MAJOR 以外のリリースでは `@eutelo/eutelo` メタパッケージ経由のインストールが常に成功することを CI で担保する。

## 7. 成功指標
- main にバージョン PR をマージするだけで publish まで自動完了し、人手作業ゼロ。
- 各リリースに必ず changelog / release note / Git タグ / dist-tag 記録が揃っている。
- `npm install @eutelo/cli@latest` および `@eutelo/eutelo@latest` が毎回 CI で成功する。
- RC (`next`) を用いた先行検証が月次で実施され、本番障害の回避につながっている。

## 8. Dependencies / Related
- `PRD-EUTELO-GOVERNANCE`
- `ADR-0105-PublishingPolicy`
- `ADR-0106-VersioningPolicy`
- `DSG-EUTELO-CORE-DISTRIBUTION`（公開アーキテクチャの詳細が前提）
- `docs/ops/runbook-eutelo-cli-ci.md`（運用ランブック）

## 9. Risks / Assumptions
- npm 側の障害で publish が遅延する可能性（dist-tag で切り替える fallback を前提）
- provenance 署名対応の npm Token/OIDC 設定が Runner で利用できない環境では手動対応が必要
- 依存置換スクリプトの失敗によりバージョン齟齬が起きるリスク（事前に dry-run / pack で検証する）
- MAJOR リリース時の互換性検証範囲が不足すると、外部ユーザーへの破壊的影響が顕在化する恐れ

## 10. Open Questions
- バージョン PR の生成方式：Changesets を導入するか、既存スクリプトと release PR テンプレートで運用するか。
- リリースノート自動生成のフォーマット：CHANGELOG ベースか、CI で集約した diff/ADR リンクを使うか。
- RC の評価対象プロジェクト: 公式に維持するサンプルリポジトリを増やすか（Dento 以外の 2 プロジェクトを想定）。

## 11. 想定フロー（ドラフト）
1. リリース PR でバージョンと CHANGELOG を確定（レビュー必須）。
2. `release/*` マージ or `vX.Y.Z` タグ作成 → リリースジョブ起動。
3. `npm ci → build → test → guard` でゲートし、依存置換を実施。
4. 順序付きで publish（`--provenance --access public`、必要に応じて `--tag next`）。
5. Git タグ / Release ノート作成、publish 結果と provenance URL を通知。
6. `npm install` によるインストール検証とメタパッケージ動作確認。
7. 失敗時は dist-tag 切替・再実行、成功時は runbook へ記録。
