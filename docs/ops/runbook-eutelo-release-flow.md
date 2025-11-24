---
id: runbook-eutelo-release-flow
type: runbook
title: Eutelo Release Flow 運用ランブック
purpose: >
  @eutelo スコープの npm パッケージをリリースする際の手順とトラブルシューティングを記載する。
status: draft
version: 0.1.0
last_updated: "2025-11-22"
---

# Eutelo Release Flow 運用ランブック

## 概要

このランブックは、Eutelo の npm パッケージをリリースする際の手順を記載しています。
リリースフローは CI 駆動で自動実行されますが、事前確認やトラブルシューティングの手順も含まれます。

## 前提条件

- GitHub Secrets に `NPM_TOKEN` が設定されていること
- npm automation token が有効であること
- OIDC 認証が有効であること（provenance 署名のため）

## リリース前の確認

### 1. バージョン整合性の確認

```bash
# バージョン検証のみ実行
node scripts/release/version-validator.js
```

このコマンドで以下を確認します：
- 全パッケージの SemVer 形式が正しいか
- 内部依存のバージョンが一致しているか
- CHANGELOG と package.json のバージョンが一致しているか

### 2. Dry-run での動作確認

**ローカルで実行（推奨）:**

```bash
# 完全な dry-run（プレフライトチェック含む）
node scripts/release/release-flow.js --dry-run

# プレフライトチェックをスキップして dry-run
node scripts/release/release-flow.js --dry-run --skip-preflight
```

**GitHub Actions で実行:**

1. GitHub リポジトリの「Actions」タブを開く
2. 「Release」ワークフローを選択
3. 「Run workflow」をクリック
4. 以下のパラメータを設定：
   - `version`: リリースするバージョン（例: `1.0.0`）
   - `dist_tag`: `latest` または `next`
   - `dry_run`: `true` にチェック
5. 「Run workflow」をクリック

### 3. Dry-run の確認ポイント

- ✅ バージョン整合性検証が成功する
- ✅ プレフライトチェック（build/test/guard）が成功する
- ✅ 依存関係の置換が正しく行われる
- ✅ 各パッケージの `npm pack --dry-run` が成功する
- ✅ 公開順序が正しい（core → infrastructure → ... → cli → eutelo）

## リリース準備（バージョンとCHANGELOGの確定）

### 1. リリース準備スクリプトの実行

```bash
# 全パッケージのバージョンを更新（例: 0.3.0）
node scripts/release/prepare-release.js 0.3.0

# 特定のパッケージのみ更新（例: core と cli）
node scripts/release/prepare-release.js 0.3.0 core cli
```

このスクリプトは以下を実行します：
- 各パッケージの `package.json` のバージョンを更新
- 各パッケージの `CHANGELOG.md` に新しいエントリを追加（空のテンプレート）

### 2. CHANGELOGの内容を記入

スクリプトで生成されたCHANGELOGエントリに、実際の変更内容を記入します：

```markdown
## [0.3.0] - 2025-11-24

### Added
- リリースフロー自動化機能を追加
- GitHub Actions ワークフローを追加

### Changed
- 依存関係の置換処理を改善

### Fixed
- バージョン検証ロジックの改善
```

各パッケージの `packages/*/CHANGELOG.md` を編集してください。

### 3. 変更をコミットしてPRを作成

```bash
# 変更を確認
git status

# 変更をステージング
git add packages/*/package.json packages/*/CHANGELOG.md

# コミット
git commit -m "chore: prepare release v0.3.0"

# ブランチを作成してプッシュ
git checkout -b release/v0.3.0
git push origin release/v0.3.0
```

GitHubでPRを作成し、レビュー後にマージします。

### 4. マージ後の確認

PRがマージされたら、mainブランチで以下を確認：

```bash
git checkout main
git pull origin main

# バージョン整合性を確認
node scripts/release/version-validator.js

# Dry-runで最終確認
node scripts/release/release-flow.js --dry-run
```

## リリース実行

### 方法1: タグトリガー（推奨）

```bash
# タグを作成してプッシュ
git tag v0.3.0
git push origin v0.3.0
```

タグをプッシュすると、GitHub Actions が自動的にリリースジョブを起動します。

タグをプッシュすると、GitHub Actions が自動的にリリースジョブを起動します。

### 方法2: 手動実行（workflow_dispatch）

1. GitHub リポジトリの「Actions」タブを開く
2. 「Release」ワークフローを選択
3. 「Run workflow」をクリック
4. 以下のパラメータを設定：
   - `version`: リリースするバージョン（例: `1.0.0`）
   - `dist_tag`: `latest` または `next`
   - `dry_run`: `false`（チェックを外す）
5. 「Run workflow」をクリック

## RC（Release Candidate）配布

`next` タグで RC を配布する場合：

```bash
# ローカルで実行
node scripts/release/release-flow.js --tag=next

# または GitHub Actions で実行
# workflow_dispatch で dist_tag を `next` に設定
```

## リリース後の確認

### 1. 公開確認

```bash
# 各パッケージの公開を確認
npm view @eutelo/core@latest version
npm view @eutelo/cli@latest version
npm view @eutelo/eutelo@latest version
```

### 2. インストール確認

```bash
# 一時ディレクトリでインストールテスト
mkdir /tmp/eutelo-test
cd /tmp/eutelo-test
npm init -y
npm install @eutelo/cli@latest
npx eutelo --version
```

### 3. GitHub Release の確認

- GitHub リポジトリの「Releases」セクションでリリースノートが作成されているか確認
- タグが正しく作成されているか確認

## トラブルシューティング

### プレフライトチェックが失敗する

**症状:** `npm ci`、`npm run build`、`npm test`、または `eutelo guard` が失敗

**対処:**
1. エラーログを確認
2. ローカルで同じコマンドを実行して再現確認
3. 問題を修正してコミット・プッシュ
4. 再度リリースを実行

### バージョン整合性検証が失敗する

**症状:** `version-validator.js` がエラーを報告

**対処:**
1. エラーメッセージを確認
2. 該当パッケージの `package.json` のバージョンを確認
3. 内部依存のバージョンが一致しているか確認
4. CHANGELOG のバージョンと一致しているか確認
5. 必要に応じて修正してコミット・プッシュ

### Publish が途中で失敗する

**症状:** 一部のパッケージは公開成功、残りが失敗

**対処:**
1. リリースジョブのログを確認
2. どのパッケージまで成功したか確認
3. 失敗したパッケージのエラーを確認
4. 問題を修正
5. **重要:** 既に公開済みのパッケージは再公開不要（スキップされる）
6. 再度リリースを実行（失敗したパッケージから再開される）

### 403 Forbidden エラー（パッケージ公開権限エラー）

**症状:** `npm error 403 Forbidden - You may not perform that action with these credentials`

**原因:**
- npm トークンに該当パッケージを公開する権限がない
- スコープなしパッケージの場合、npm の設定で公開権限が必要
- パッケージ名が既に使用されている（別のユーザー/組織が所有）

**対処:**
1. **npm トークンの権限確認**
   - npm の「Access Tokens」ページで、使用している Token が「Automation」タイプで「Read and Publish」権限があることを確認
   - スコープなしパッケージの場合、npm の設定で公開権限が必要な場合がある

2. **パッケージ名の確認**
   - `npm view <package-name>` でパッケージが既に存在するか確認
   - 既に存在する場合、別のユーザー/組織が所有している可能性がある

3. **スコープ付きパッケージへの変更を検討**
   - スコープなしパッケージ（例: `eslint-plugin-eutelo-docs`）をスコープ付き（例: `@eutelo/eslint-plugin-docs`）に変更することで、権限問題を回避できる場合がある
   - ただし、パッケージ名を変更すると既存のユーザーに影響があるため、慎重に検討する必要がある

4. **npm 組織の設定確認**
   - `@eutelo` スコープのパッケージの場合、npm 組織の設定で公開権限が正しく設定されているか確認

### 既に公開済みのバージョンエラー

**症状:** `403` エラーまたは「cannot publish over」エラー

**対処:**
- これは正常な動作です。既に公開済みのバージョンは自動的にスキップされます
- 新しいバージョンに更新してから再度リリースしてください

### Provenance 署名が失敗する

**症状:** `npm publish --provenance` が失敗

**対処:**
1. GitHub Actions の `permissions` に `id-token: write` が設定されているか確認
2. npm automation token が正しく設定されているか確認
3. OIDC 認証が有効か確認

### 依存関係の置換が失敗する

**症状:** `convert-deps-for-publish.js` がエラー

**対処:**
1. エラーログを確認
2. 該当パッケージの `package.json` の依存関係を確認
3. `file:` 依存が正しく記述されているか確認
4. 必要に応じて手動で修正

## ロールバック手順

### 公開済みパッケージの deprecate

```bash
# 特定バージョンを非推奨にする
npm deprecate @eutelo/cli@1.0.0 "Reason for deprecation"

# または dist-tag を変更
npm dist-tag rm @eutelo/cli@1.0.0 latest
npm dist-tag add @eutelo/cli@0.9.0 latest
```

### リリースの取り消し

1. GitHub Release を削除（必要に応じて）
2. Git タグを削除（必要に応じて）
3. パッケージを deprecate（上記参照）

## 監査証跡

リリース実行後、以下の情報が記録されます：

- 公開日時（ISO 8601）
- コミット SHA
- CI ジョブ URL
- 発行 dist-tag
- 公開結果（成功/失敗/スキップ）

監査ログは `release-{timestamp}.json` として保存され、GitHub Actions のアーティファクトとしても保存されます。

## 関連ドキュメント

- [PRD-EUTELO-RELEASE-FLOW](../../product/features/EUTELO-RELEASE-FLOW/PRD-EUTELO-RELEASE-FLOW.md)
- [DSG-EUTELO-RELEASE-FLOW](../../product/architecture/design/EUTELO-RELEASE-FLOW/DSG-EUTELO-RELEASE-FLOW.md)
- [TASK-EUTELO-RELEASE-FLOW](../../product/tasks/TASK-EUTELO-RELEASE-FLOW.md)

