# @eutelo/eutelo

> Eutelo エコシステムの全パッケージをまとめてインストールするメタパッケージ

## 概要

`@eutelo/eutelo` は、Eutelo エコシステムの全パッケージをワンコマンドでインストールできるメタパッケージです。

## インストール

```bash
npm install @eutelo/eutelo
# または
pnpm add @eutelo/eutelo
# または
yarn add @eutelo/eutelo
```

## 含まれるパッケージ

このパッケージをインストールすると、以下のパッケージが自動的にインストールされます：

- **@eutelo/core** - コア機能とサービス
- **@eutelo/infrastructure** - インフラストラクチャアダプター
- **@eutelo/distribution** - ドキュメントテンプレートと構成ガイド
- **@eutelo/cli** - コマンドラインインターフェース

## 使用方法

### CLI ツールの使用

```bash
# CLIがインストールされます
npx eutelo init
npx eutelo guard
npx eutelo scaffold
```

### プログラムからの使用

```javascript
import { ValidationService } from '@eutelo/core';
import { FileSystemAdapter } from '@eutelo/infrastructure';
import templates from '@eutelo/distribution/templates';
```


## 個別パッケージのインストール

特定のパッケージのみが必要な場合は、個別にインストールすることもできます：

```bash
# CLIのみ
npm install @eutelo/cli

# コア機能のみ
npm install @eutelo/core

# テンプレートのみ
npm install @eutelo/distribution
```

## ライセンス

MIT

## 関連リンク

- [Eutelo プロジェクト](https://github.com/eutelo/eutelo)
- [ドキュメント](https://github.com/eutelo/eutelo/tree/main/docs)

