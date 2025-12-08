---
id: MIGRATION-GUIDE-EUTELO-FEATURE-SIMPLIFICATION
type: migration-guide
feature: EUTELO-FEATURE-SIMPLIFICATION
title: Eutelo 機能簡素化 移行ガイド
purpose: >
  Eutelo v2.0.0で削除された機能の代替方法と移行手順を説明する。
status: draft
version: 0.1
last_updated: "2025-01-27"
---

# Eutelo 機能簡素化 移行ガイド

## 概要

Eutelo v2.0.0では、本来のコンセプトに合致しない機能を削除しました。  
このガイドでは、削除された機能の代替方法を説明します。

Euteloの本来のコンセプトは以下の通りです：

1. **ドキュメントをユーザー指定のルールでテンプレートに応じた規則正しい配置で作成できる**
2. **作成したドキュメント間の整合性とドキュメント自体、内部の記述に矛盾がないかをLLMが判断できる仕組みを提供**
3. **利用者が組み合わせて更新するたびにチェックを行えるエコシステムとして利用できる**

---

## 削除された機能

### 1. `eutelo graph` コマンド

すべての`eutelo graph`サブコマンドが削除されました。

#### 代替方法

| 削除コマンド | 代替方法 |
|------------|---------|
| `eutelo graph build` | 削除。グラフの可視化が必要な場合は、外部ツールを使用 |
| `eutelo graph show <documentId>` | 削除。ドキュメントの関係性は`eutelo guard`の出力で確認 |
| `eutelo graph impact <documentId>` | 削除。影響範囲は`eutelo guard`の関連ドキュメント収集機能で確認 |
| `eutelo graph summary` | 削除。統計情報が必要な場合は、設定ファイルやドキュメント構造から確認 |
| `eutelo graph related <documentPath>` | 削除。`eutelo guard`の関連ドキュメント収集機能で代替 |

#### 詳細

`eutelo guard`は内部的にグラフ機能を使用して関連ドキュメントを自動収集します。  
ドキュメント間の関係性を確認したい場合は、`eutelo guard`の出力を確認してください。

```bash
# 関連ドキュメントを含めて整合性チェック
pnpm exec eutelo guard docs/product/features/AUTH/PRD-AUTH.md

# 関連ドキュメントの収集深度を指定
pnpm exec eutelo guard --depth=2 docs/product/features/AUTH/PRD-AUTH.md

# すべての関連ドキュメントを収集
pnpm exec eutelo guard --all docs/product/features/AUTH/PRD-AUTH.md
```

---

### 2. `eutelo config inspect` コマンド

設定ファイルの確認コマンドが削除されました。

#### 代替方法

設定ファイル（`eutelo.config.*`）を直接確認してください。

```bash
# 設定ファイルを直接確認
cat eutelo.config.ts
# または
cat eutelo.config.json
# または
cat eutelo.config.yaml
```

設定ファイルは以下の順序で自動検出されます：

1. `eutelo.config.ts` / `eutelo.config.mts` / `eutelo.config.cts`
2. `eutelo.config.js` / `eutelo.config.mjs` / `eutelo.config.cjs`
3. `eutelo.config.json`
4. `eutelo.config.yaml` / `eutelo.config.yml`

---

### 3. `eutelo init --placeholder-format` オプション

プレースホルダー形式をカスタマイズするオプションが削除されました。

#### 代替方法

プレースホルダー形式は固定形式（`__VARIABLE__`）を使用します。

動的パス（例：`product/features/{FEATURE}`）は、`eutelo init`実行時に`__FEATURE__`というプレースホルダーディレクトリに変換されます。

```bash
# プレースホルダーディレクトリを作成（デフォルト）
pnpm exec eutelo init

# プレースホルダーディレクトリの作成をスキップ
pnpm exec eutelo init --skip-dynamic-paths
```

---

### 4. `eutelo guard --japanese` / `--ja` オプション

出力言語を指定するオプションが削除されました。

#### 代替方法

LLMの応答言語は、プロンプトテンプレートやモデル設定で制御してください。

**プロンプトテンプレートで制御:**

```markdown
<!-- prompts/guard-system.md -->
あなたはドキュメントの整合性をチェックする専門家です。
日本語で回答してください。

...
```

**モデル設定で制御:**

一部のLLMモデルは、システムプロンプトや初期プロンプトで言語を指定できます。  
モデルのドキュメントを参照してください。

---

### 5. 組み込みドキュメント種別の非推奨化

組み込みドキュメント種別（`prd`, `beh`, `sub-prd`, `sub-beh`, `dsg`, `adr`, `task`, `ops`）は非推奨です。

#### 代替方法

カスタムドキュメント種別を設定ファイルで定義して使用してください。

#### 移行手順

1. **`eutelo.config.ts`でカスタム種別を定義**

```typescript
// eutelo.config.ts
import { defineConfig } from '@eutelo/core/config';

export default defineConfig({
  scaffold: {
    'feature.prd': {
      id: 'feature.prd',
      kind: 'prd',
      path: 'product/features/{FEATURE}/PRD-{FEATURE}.md',
      template: '_template-prd.md',
      variables: {
        ID: 'PRD-{FEATURE}',
        PARENT: '/'
      },
      frontmatterDefaults: {
        type: 'prd',
        parent: '/'
      }
    },
    'feature.beh': {
      id: 'feature.beh',
      kind: 'beh',
      path: 'product/features/{FEATURE}/BEH-{FEATURE}.md',
      template: '_template-beh.md',
      variables: {
        ID: 'BEH-{FEATURE}',
        PARENT: 'PRD-{FEATURE}'
      },
      frontmatterDefaults: {
        type: 'behavior',
        parent: 'PRD-{FEATURE}'
      }
    }
    // ... 他の種別も同様に定義
  },
  frontmatter: {
    schemas: [
      {
        kind: 'prd',
        fields: {
          id: { type: 'string', required: true },
          type: { type: 'string' },
          parent: { type: 'string', relation: 'parent' },
          // ...
        }
      },
      {
        kind: 'beh',
        fields: {
          id: { type: 'string', required: true },
          type: { type: 'string' },
          parent: { type: 'string', relation: 'parent' },
          // ...
        }
      }
      // ... 他の種別のスキーマも定義
    ]
  }
});
```

2. **`eutelo add <kind>`を使用**

```bash
# カスタム種別を使用
pnpm exec eutelo add prd <feature>
pnpm exec eutelo add beh <feature>
```

組み込み種別を使用した場合、非推奨警告が表示されますが、動作は継続します。

---

## よくある質問

### Q: `eutelo graph`コマンドはなぜ削除されたのですか？

A: `eutelo graph`は独立した分析・可視化ツールとして提供されていましたが、Euteloの本来のコンセプト（整合性チェックエコシステム）とは異なる目的でした。グラフ機能は`eutelo guard`が内部的に使用しており、独立したコマンドとして公開する必要はありません。

### Q: グラフの可視化が必要な場合はどうすればよいですか？

A: 外部ツール（例：Graphviz、Mermaid CLI）を使用して、ドキュメント構造を可視化できます。必要に応じて、カスタムスクリプトを作成することも可能です。

### Q: 組み込み種別はいつ完全に削除されますか？

A: 現在は非推奨として警告を表示していますが、動作は継続します。完全な削除時期は未定です。カスタム種別への移行を推奨します。

### Q: 既存のワークフローで`eutelo graph`を使用しています。どうすればよいですか？

A: `eutelo guard`の関連ドキュメント収集機能を使用するか、外部ツールに移行してください。詳細は上記の「代替方法」を参照してください。

---

## 関連ドキュメント

- [PRD-EUTELO-FEATURE-SIMPLIFICATION](../features/EUTELO-FEATURE-SIMPLIFICATION/PRD-EUTELO-FEATURE-SIMPLIFICATION.md) - 機能簡素化PRD
- [DSG-EUTELO-FEATURE-SIMPLIFICATION](../../architecture/design/EUTELO-FEATURE-SIMPLIFICATION/DSG-EUTELO-FEATURE-SIMPLIFICATION.md) - 設計仕様
- [README.md](../../../README.md) - Euteloドキュメント

