# EUTELO documentation

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
