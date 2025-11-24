# 開発者向けドキュメント

日本語 | [English](DEVELOPERS.md)

このリポジトリの開発に使用するコマンドと手順です。

## ビルドとテスト

```bash
npm run build    # すべてのパッケージをビルド
npm run clean    # ビルド成果物を削除
npm test         # ビルドしてからテストを実行
```

## 依存関係の管理

```bash
npm run deps:publish  # 依存関係を公開用（バージョン番号）に変換
npm run deps:local    # 依存関係をローカル開発用（file:）に変換
```

## パッケージの公開

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

