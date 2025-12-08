# Examples（参考資料）

このディレクトリには、Eutelo ドキュメント構造を活用する際の
**参考例（例示のみ）** が含まれています。

> **Note:**  
> 本パッケージでは実装コードは含まれていません。  
> 実際の CI/CD や scaffold ツールの実装は別途必要です。

---

## ディレクトリ構成

```
examples/
  ci/              # CI/CD ワークフローの例示
    README.md       # CI ワークフローの詳細な説明
  scaffold/         # プロジェクト構成の例示
  README.md         # このファイル
```

---

## 利用方法

各ディレクトリの README またはサンプルファイルを参照してください。

### CI ワークフロー例

以下のワークフローファイルは、`eutelo guard` を使用してドキュメントの整合性を検証する GitHub Actions の例です。

#### `ci/guard-pull-request.yml`
プルリクエスト時に `docs/**` 配下のドキュメントに変更があった場合に実行されます。

**主な機能:**
- 変更されたドキュメントファイルを検出
- 変更されたドキュメントと関連ファイルを `eutelo guard` で検証
- 検証結果（Issues/Warnings）をPRコメントとして投稿

**必要なシークレット:**
- `EUTELO_GUARD_API_ENDPOINT`: Guard API のエンドポイント
- `EUTELO_GUARD_API_KEY`: Guard API の認証キー
- `EUTELO_GUARD_MODEL`: 使用するLLMモデル名

#### `ci/guard-main.yml`
`main` ブランチへの push 時に `docs/**` 配下のドキュメントに変更があった場合に実行されます。

**主な機能:**
- `guard-pull-request.yml` と同様の処理を実行
- 検証結果をワークフローのログに出力（PRコメントは投稿しない）

#### `ci/guard-dispatch.yml`
手動実行用のワークフローです。

**主な機能:**
- `workflow_dispatch` で手動実行可能
- `paths`: 検証対象のファイルパス（デフォルト: `docs/**/*.md`）
- `working-directory`: 作業ディレクトリ（デフォルト: `.`）
- `format`: 出力形式（`text` または `json`、デフォルト: `text`）
- 検証結果をワークフローのログに出力

#### `ci/github-actions-workflow-example.yml`
汎用的な検証フローの骨子となる参考例です。

### Scaffold 例
`scaffold/README.md` を参照してください。

### 詳細な説明

各ワークフローの詳細な説明やセットアップ手順については、`ci/README.md` を参照してください。

---

## ワークフローの動作フロー

各 `guard-*.yml` ワークフローは以下の手順で動作します：

1. **変更ファイルの検出**
   - `tj-actions/changed-files` を使用して `docs/**/*.md` の変更を検出

2. **Guard 実行**
   - 抽出した関連ファイルを `eutelo guard --format json` に渡して検証
   - JSON形式で結果を取得

5. **結果の投稿**
   - **PR用**: `actions/github-script` を使用してPRコメントとして投稿
   - **main/dispatch用**: ワークフローのログに出力

## 注意事項

- これらの例は **参考用** であり、そのまま使用できる実装です
- 実際のプロジェクトでは、`docsRoot` の設定やシークレットの設定を適切に行ってください
- `eutelo.config.json` で `docsRoot` が設定されている場合、ワークフロー内のパスを調整する必要がある場合があります
- 実装に関する詳細は、各プロジェクトのドキュメントを参照してください

