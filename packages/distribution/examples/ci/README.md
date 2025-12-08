# CI ワークフロー例

このディレクトリには、`eutelo guard` を使用してドキュメントの整合性を検証する GitHub Actions ワークフローの例が含まれています。

## ファイル一覧

| ファイル名 | 説明 |
|-----------|------|
| `guard-pull-request.yml` | プルリクエスト時に実行されるワークフロー |
| `guard-main.yml` | mainブランチへのpush時に実行されるワークフロー |
| `guard-dispatch.yml` | 手動実行用のワークフロー |
| `github-actions-workflow-example.yml` | 汎用的な検証フローの骨子（参考用） |

## 各ワークフローの詳細

### `guard-pull-request.yml`

**トリガー:**
- `pull_request` イベント
- `docs/**` 配下のファイルに変更があった場合のみ実行

**機能:**
1. 変更されたドキュメントファイルを検出
2. 変更ファイルと関連ファイルを `eutelo guard` で検証（`--related`オプションで自動的に関連ファイルを収集）
3. 検証結果（Issues/Warnings/Errors）をPRコメントとして投稿

**必要なシークレット:**
- `EUTELO_GUARD_API_ENDPOINT`: Guard API のエンドポイント（例: `https://api.openai.com`）
- `EUTELO_GUARD_API_KEY`: Guard API の認証キー
- `EUTELO_GUARD_MODEL`: 使用するLLMモデル名（例: `gpt-4o-mini`）

**必要な権限:**
- `contents: read`: リポジトリの内容を読み取る
- `pull-requests: write`: PRコメントを投稿する

### `guard-main.yml`

**トリガー:**
- `push` イベント
- `main` ブランチへのpush
- `docs/**` 配下のファイルに変更があった場合のみ実行

**機能:**
- `guard-pull-request.yml` と同様の処理を実行
- 検証結果をワークフローのログに出力（PRコメントは投稿しない）

**必要なシークレット:**
- `EUTELO_GUARD_API_ENDPOINT`
- `EUTELO_GUARD_API_KEY`
- `EUTELO_GUARD_MODEL`

**必要な権限:**
- `contents: read`: リポジトリの内容を読み取る

### `guard-dispatch.yml`

**トリガー:**
- `workflow_dispatch` イベント（手動実行）

**入力パラメータ:**
- `paths`: 検証対象のファイルパス（スペース区切り、デフォルト: `docs/**/*.md`）
- `working-directory`: 作業ディレクトリ（デフォルト: `.`）
- `format`: 出力形式（`text` または `json`、デフォルト: `text`）

**機能:**
- 指定されたパスのファイルを検証
- 指定ファイルと関連ファイルを `eutelo guard` で検証（`--related`オプションで自動的に関連ファイルを収集）
- 検証結果をワークフローのログに出力

**必要なシークレット:**
- `EUTELO_GUARD_API_ENDPOINT`
- `EUTELO_GUARD_API_KEY`
- `EUTELO_GUARD_MODEL`

**必要な権限:**
- `contents: read`: リポジトリの内容を読み取る

## ワークフローの動作フロー

各ワークフローは以下の手順で動作します：

### 1. 変更ファイルの検出

`tj-actions/changed-files@v44` を使用して、`docs/**/*.md` の変更を検出します。

```yaml
- name: Get changed files
  id: changed-files
  uses: tj-actions/changed-files@v44
  with:
    files: |
      docs/**/*.md
```

### 2. Guard 実行

抽出した関連ファイルを `eutelo guard` に渡して検証します。

```bash
npx eutelo guard --format json $RELATED_FILES
```

### 3. 結果の投稿

**PR用ワークフロー (`guard-pull-request.yml`):**
- `actions/github-script@v7` を使用してPRコメントとして投稿
- Issues、Warnings、Suggestions を整形して表示

**main/dispatch用ワークフロー:**
- ワークフローのログに出力
- JSON形式の場合は整形して表示

## セットアップ手順

### 1. ワークフローファイルの配置

`.github/workflows/` ディレクトリにワークフローファイルを配置します。

```bash
mkdir -p .github/workflows
cp packages/distribution/examples/ci/guard-pull-request.yml .github/workflows/
cp packages/distribution/examples/ci/guard-main.yml .github/workflows/
cp packages/distribution/examples/ci/guard-dispatch.yml .github/workflows/
```

### 2. シークレットの設定

GitHubリポジトリの Settings > Secrets and variables > Actions で以下のシークレットを設定します：

- `EUTELO_GUARD_API_ENDPOINT`: Guard API のエンドポイント
- `EUTELO_GUARD_API_KEY`: Guard API の認証キー
- `EUTELO_GUARD_MODEL`: 使用するLLMモデル名

### 3. 設定の調整

必要に応じて、以下の設定を調整してください：

- **`docsRoot` の設定**: `eutelo.config.json` で `docsRoot` が設定されている場合、ワークフロー内のパス（`docs/**`）を適切に変更してください
- **ファイルパターン**: 検証対象のファイルパターンを変更する場合は、`files` パラメータを調整してください
- **権限設定**: PRコメントを投稿する場合は、`pull-requests: write` 権限が必要です

## トラブルシューティング

### Guard の実行に失敗する

- シークレットが正しく設定されているか確認してください
- API エンドポイントとキーが正しいか確認してください
- モデル名が正しいか確認してください

## 参考資料

- [Eutelo Guard のドキュメント](../../../../docs/product/features/DOC-GUARD/)
- [Eutelo Graph のドキュメント](../../../../docs/product/features/DOC-GRAPH/)
- [GitHub Actions のドキュメント](https://docs.github.com/ja/actions)

