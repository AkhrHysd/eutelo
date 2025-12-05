# マイグレーションガイド: directoryStructure 設定

このガイドでは、既存のEuteloプロジェクトで新しい `directoryStructure` 設定機能を利用する方法を説明します。

## 概要

`eutelo init` で作成されるディレクトリ構造を設定ファイルでカスタマイズできるようになりました。この機能は**完全に後方互換**であり、既存のプロジェクトには影響ありません。

## 後方互換性

- `directoryStructure` が設定されていない場合、従来どおりのデフォルト構造が使用されます
- 既存の `eutelo.config.*` ファイルはそのまま動作します
- 追加の移行作業は不要です

## 新機能の活用

### 1. カスタムディレクトリ構造の定義

プロジェクトに合わせたディレクトリ構造を定義できます：

```typescript
// eutelo.config.ts
export default {
  docsRoot: 'docs',
  directoryStructure: {
    'product': [],
    'product/features': [],
    'product/features/{FEATURE}': [
      { file: 'PRD-{FEATURE}.md', template: 'templates/prd.md' }
    ],
    'architecture': [],
    'architecture/design': [],
    'architecture/adr': []
  }
};
```

### 2. 動的パスの活用

`{FEATURE}` のようなプレースホルダーを使用できます：

```typescript
directoryStructure: {
  'product/features/{FEATURE}': [
    { file: 'PRD-{FEATURE}.md', template: 'templates/prd.md' }
  ],
  'architecture/design/{FEATURE}': [
    { file: 'DSG-{FEATURE}.md', template: 'templates/dsg.md' }
  ]
}
```

`eutelo init` 実行時、動的パスは `__FEATURE__` のようなプレースホルダーディレクトリに変換されます。

### 3. CLIオプション

新しいCLIオプションが追加されました：

```bash
# 動的パスのプレースホルダーディレクトリをスキップ
eutelo init --skip-dynamic-paths

# プレースホルダーディレクトリを明示的に作成（デフォルト）
eutelo init --create-placeholders
```

## 配列形式（後方互換性のため）

シンプルな用途には配列形式も使用できます：

```typescript
directoryStructure: [
  [],                       // ルート（docsRoot）
  ['product'],              // docsRoot/product
  ['product', 'features'],  // docsRoot/product/features
  ['architecture']          // docsRoot/architecture
]
```

## 移行手順

### 現在の構造を維持したい場合

何もする必要はありません。デフォルトの動作が継続されます。

### カスタム構造に移行したい場合

1. 現在のディレクトリ構造を確認：
   ```bash
   eutelo init --dry-run
   ```

2. `eutelo.config.*` に `directoryStructure` を追加：
   ```typescript
   export default {
     // ... 既存の設定
     directoryStructure: {
       'your-custom': [],
       'your-custom/subdirs': []
     }
   };
   ```

3. 新しい構造を確認：
   ```bash
   eutelo init --dry-run
   ```

4. 実際に適用：
   ```bash
   eutelo init
   ```

## 注意事項

- `directoryStructure` を指定すると、デフォルト構造は使用されません
- 既存のディレクトリやファイルは上書きされません
- 動的パスはプレースホルダーとして作成され、実際のドキュメント作成は `eutelo add` で行います

