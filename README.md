# EUTELO documentation

Eutelo は、目的駆動・構造化ドキュメントの思想に基づいたドキュメント管理ツールキットです。  
CLI は `eutelo.config.*` と preset を自動で解決し、設定に従って Scaffold / Guard / Check / Graph を実行します（デフォルトで `@eutelo/preset-default` を読み込み、ローカル設定で上書きできます）。

## インストール

### メタパッケージからインストール（推奨）

すべてのパッケージを一度にインストール：

```bash
npm install @eutelo/eutelo
# または
pnpm add @eutelo/eutelo
# または
yarn add @eutelo/eutelo
```

### 個別パッケージからインストール

必要なパッケージのみをインストール：

```bash
# CLIツールのみ
npm install @eutelo/cli

# コア機能のみ
npm install @eutelo/core

# テンプレートのみ
npm install @eutelo/distribution
```

## CLI コマンド

> **注意**: CLIコマンドは以下のいずれかの方法で実行してください。  
> すべてのコマンドは `--config <path>` オプションを受け取り、特定の `eutelo.config.*` を参照できます。オプションを省略するとプロジェクトルートの設定を自動検出し、preset とマージした上で UseCase を 1 回だけ呼び出します。

### 実行方法

**方法1: `pnpm exec`/`npm exec` を使用（推奨）**

`@eutelo/eutelo`または`@eutelo/cli`をインストールしている場合、`pnpm exec`で実行できます：

```bash
# まずインストール
pnpm add -w @eutelo/eutelo
# または
pnpm add -w @eutelo/cli

# その後、コマンドを実行
pnpm exec eutelo init
pnpm exec eutelo add prd <feature>
```

**方法2: `npx` を使用**

プロジェクト依存をインストール済みならグローバル導入なしで実行できます（CI では必ず `npm ci` 後に `npx` を推奨）。

```bash
npm ci
npx eutelo init
npx eutelo check --format=json
npx eutelo guard docs/**/*.md --warn-only
```

**方法3: `package.json`の`scripts`に追加（推奨）**

```json
{
  "scripts": {
    "eutelo:init": "pnpm exec eutelo init",
    "eutelo:add:prd": "pnpm exec eutelo add prd"
  }
}
```

**方法4: `node_modules/.bin`を直接参照**

```json
{
  "scripts": {
    "eutelo:init": "node_modules/.bin/eutelo init"
  }
}
```

**方法5: グローバルインストール（オプション）**

```bash
npm install -g @eutelo/cli
eutelo init
```

> **補足**: すべてのコマンドは設定駆動です。テンプレートパスや docsRoot をローカル設定で上書きする場合、テンプレート/スキーマへの相対パスは「設定ファイルの位置」または「カレントディレクトリ」から解決されます。

### `eutelo init`

プロジェクトに Eutelo ドキュメント構造を初期化します。

```bash
pnpm exec eutelo init
pnpm exec eutelo init --dry-run  # ディレクトリを作成せずに確認
```

### `eutelo add`

テンプレートからドキュメントを生成します。

```bash
# PRD（Product Requirements Document）を生成
pnpm exec eutelo add prd <feature>

# BEH（Behavior Specification）を生成
pnpm exec eutelo add beh <feature>

# SUB-PRD（Sub Product Requirements Document）を生成
pnpm exec eutelo add sub-prd <feature> <sub>

# SUB-BEH（Sub Behavior Specification）を生成
pnpm exec eutelo add sub-beh <feature> <sub>

# DSG（Design Specification）を生成
pnpm exec eutelo add dsg <feature>

# ADR（Architecture Decision Record）を生成
pnpm exec eutelo add adr <feature>

# TASK（Task Plan）を生成
pnpm exec eutelo add task <name>

# OPS（Operations Runbook）を生成
pnpm exec eutelo add ops <name>
```

### `eutelo lint`

ドキュメントファイルに対して lint を実行します。

```bash
pnpm exec eutelo lint                    # すべてのドキュメントを lint
pnpm exec eutelo lint docs/**/*.md       # 指定したパスを lint
pnpm exec eutelo lint --format json      # JSON形式で出力
```

### `eutelo sync`

現在の構造に基づいて、不足しているドキュメントアーティファクトを生成します。

```bash
pnpm exec eutelo sync                    # 不足しているドキュメントを生成
pnpm exec eutelo sync --check-only       # 生成せずにレポートのみ
```

### `eutelo check`

Eutelo ドキュメント構造と frontmatter の一貫性を検証します。

```bash
pnpm exec eutelo check                   # 構造と frontmatter を検証
pnpm exec eutelo check --format json     # JSON形式で出力
pnpm exec eutelo check --ci              # CI向けのJSON出力
```

### `eutelo guard`

実験的なドキュメントガード一貫性チェックを実行します。

**環境変数の設定**

`eutelo guard` コマンドを使用するには、以下の環境変数を設定する必要があります。環境変数は以下のいずれかの方法で設定できます：

1. **`.env`ファイルを使用（推奨）**
   
   プロジェクトルートに`.env`ファイルを作成し、以下の変数を設定します：

   ```bash
   EUTELO_GUARD_API_ENDPOINT=https://api.openai.com
   EUTELO_GUARD_API_KEY=your-api-key-here
   EUTELO_GUARD_MODEL=gpt-4o-mini
   EUTELO_GUARD_DEBUG=false
   ```

   `.env.example`ファイルをコピーして`.env`を作成できます：

   ```bash
   cp .env.example .env
   # .envファイルを編集してAPIキーを設定
   ```

2. **環境変数を直接設定**

   ```bash
   export EUTELO_GUARD_API_ENDPOINT=https://api.openai.com
   export EUTELO_GUARD_API_KEY=your-api-key-here
   export EUTELO_GUARD_MODEL=gpt-4o-mini
   pnpm exec eutelo guard
   ```

**使用方法**

```bash
pnpm exec eutelo guard                           # ガードチェックを実行
pnpm exec eutelo guard docs/**/*.md             # 指定したドキュメントをチェック
pnpm exec eutelo guard --format json             # JSON形式で出力
pnpm exec eutelo guard --warn-only               # エラーでも終了コード2を返さない
pnpm exec eutelo guard --fail-on-error           # 問題検出時に終了コード2を返す（デフォルト）
# preset を切り替えた場合でも、設定を再解決して 1 回だけ UseCase を呼び出します
# guard プロンプトは config.guard.prompts から読み込まれるため、preset なしでは実行できません
```

### `eutelo config inspect`

`eutelo.config.*` と preset を解決し、マージ後の設定を確認します。

```bash
pnpm exec eutelo config inspect                         # プロジェクトルートの設定を解決
pnpm exec eutelo config inspect --config ./eutelo.config.yaml
pnpm exec eutelo config inspect --format json           # JSON 形式で出力
```

## 開発用コマンド

このリポジトリの開発に使用するコマンドです。

### ビルドとテスト

```bash
npm run build    # すべてのパッケージをビルド
npm run clean    # ビルド成果物を削除
npm test         # ビルドしてからテストを実行
```

### 依存関係の管理

```bash
npm run deps:publish  # 依存関係を公開用（バージョン番号）に変換
npm run deps:local    # 依存関係をローカル開発用（file:）に変換
```

### パッケージの公開

```bash
# コアパッケージを公開
npm run publish:core

# プラグインパッケージを公開
npm run publish:plugins

# CLIパッケージを公開
npm run publish:cli

# メタパッケージを公開
npm run publish:meta

# すべてのパッケージを公開
npm run publish:all
```

## CI での guard 実行方法

Eutelo には、GitHub Actions で `eutelo guard` を実行するための再利用ワークフローと Composite Action を用意しています。最小設定で導入したい場合は、次のいずれかを選んでください。

### 再利用ワークフローを呼び出す

`.github/workflows/guard.yml` を `workflow_call` で呼び出し、必要なシークレットを渡します。

```yaml
name: Guard

on:
  pull_request:
  push:

jobs:
  guard:
    uses: ./.github/workflows/guard.yml
    secrets:
      EUTELO_GUARD_API_ENDPOINT: ${{ secrets.EUTELO_GUARD_API_ENDPOINT }}
      EUTELO_GUARD_API_KEY: ${{ secrets.EUTELO_GUARD_API_KEY }}
    with:
      # 必要に応じて上書き
      paths: docs/**/*.md
      working-directory: .
      format: text
```

### Composite Action を直接使う

独自のワークフロー内で `.github/actions/guard` をステップとして呼び出すこともできます。`env` に API 情報をセットし、`with` で入力を上書きします。

```yaml
jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/guard
        env:
          EUTELO_GUARD_API_ENDPOINT: ${{ secrets.EUTELO_GUARD_API_ENDPOINT }}
          EUTELO_GUARD_API_KEY: ${{ secrets.EUTELO_GUARD_API_KEY }}
        with:
          paths: docs/**/*.md
          working-directory: .
          format: text
```

### テンプレート

すぐに試せる PR/メイン/手動実行向けテンプレートは `packages/distribution/examples/ci/` 配下にあります。自分のリポジトリへコピーし、シークレットや `working-directory` を必要に応じて上書きしてください。

### CI 実行のポイント
- ワークフローではグローバルインストールではなく `npm ci` + `npx eutelo guard ...` を推奨します（本リポジトリの `.github/workflows/guard.yml` も同様）。
- LLM 用の環境変数は Secrets/Vars で渡し、preset やローカル設定の差し替えをしてもワークフローは変更不要です。
