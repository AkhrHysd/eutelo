# EUTELO documentation

日本語 | [English](README.md)

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

## 設定ファイル

Euteloは設定ファイルを使用して、ドキュメントテンプレート、frontmatterスキーマ、ガードプロンプトを定義します。設定ファイルはTypeScript（`.ts`, `.mts`, `.cts`）、JavaScript（`.js`, `.mjs`, `.cjs`）、JSON（`.json`）、またはYAML（`.yaml`, `.yml`）で記述できます。

### 設定ファイルの場所

Euteloは以下の順序で設定ファイルを自動検索します：
1. `eutelo.config.ts` / `eutelo.config.mts` / `eutelo.config.cts`
2. `eutelo.config.js` / `eutelo.config.mjs` / `eutelo.config.cjs`
3. `eutelo.config.json`
4. `eutelo.config.yaml` / `eutelo.config.yml`

`--config <path>`オプションでカスタムパスを指定することもできます。

### 設定構造

```typescript
// eutelo.config.ts
import { defineConfig } from '@eutelo/core/config';

export default defineConfig({
  // オプション: 拡張するpresetパッケージ
  presets: ['@eutelo/preset-default'],
  
  // オプション: ドキュメントルートディレクトリ（デフォルト: 'eutelo-docs'）
  docsRoot: 'docs',
  
  // ドキュメントテンプレートを含むディレクトリ構造
  directoryStructure: {
    'product': [],
    'product/features/{FEATURE}': [
      {
        file: 'PRD-{FEATURE}.md',
        kind: 'prd',
        template: 'templates/prd.md',
        prefix: 'PRD-',
        variables: ['FEATURE'],
        frontmatterDefaults: {
          type: 'prd',
          parent: '/'
        }
      }
    ]
  },
  
  // Frontmatterスキーマ定義
  frontmatter: {
    // ルート親ID（親を持たないドキュメント）
    rootParentIds: ['PRINCIPLE-GLOBAL'],
    
    // 各ドキュメント種別のスキーマ定義
    schemas: [
      {
        kind: 'prd',
        fields: {
          id: { type: 'string', required: true },
          type: { type: 'string' },
          parent: { type: 'string', relation: 'parent' },
          related: { type: 'array', relation: 'related' },
          tags: { type: 'array' },
          status: { type: 'enum', enum: ['draft', 'review', 'approved'] }
        }
      }
    ]
  },
  
  // 一貫性チェック用のガードプロンプト
  guard: {
    prompts: {
      'guard.default': {
        id: 'guard.default',
        templatePath: 'prompts/guard-system.md',
        model: 'gpt-4o-mini',
        temperature: 0.2
      }
    }
  }
});
```

### 設定フィールド

#### `presets`（オプション）
Presetパッケージ名の配列。Presetは順番にマージされ、後のpresetやローカル設定が前の設定を上書きします。

#### `docsRoot`（オプション）
ドキュメントファイルのルートディレクトリ。デフォルトは`eutelo-docs`。`EUTELO_DOCS_ROOT`環境変数で上書きできます。

#### `directoryStructure`（オプション）
`eutelo init`で作成されるディレクトリ構造を定義します。2つの形式をサポートしています：

**配列形式（シンプル）:**
```typescript
directoryStructure: [
  [],                       // ルート（docsRoot）
  ['product'],              // docsRoot/product
  ['product', 'features'],  // docsRoot/product/features
  ['architecture'],         // docsRoot/architecture
]
```

**ディレクトリ-ファイル定義形式（推奨）:**
```typescript
directoryStructure: {
  'product': [],
  'product/features/{FEATURE}': [
    {
      file: 'PRD-{FEATURE}.md',
      kind: 'prd',                      // eutelo add で使用するドキュメント種別
      template: 'templates/prd.md',
      prefix: 'PRD-',
      variables: ['FEATURE'],
      rules: 'rules/prd-validation.md',  // eutelo rule 用のルールファイル（オプション）
      frontmatterDefaults: {            // フロントマターのデフォルト値
        type: 'prd',
        parent: '/'
      }
    },
    {
      file: 'BEH-{FEATURE}.md',
      kind: 'beh',
      template: 'templates/beh.md',
      prefix: 'BEH-',
      variables: ['FEATURE'],
      rules: 'rules/beh-validation.md', // eutelo validate 用のルールファイル（オプション）
      frontmatterDefaults: {
        type: 'behavior',
        parent: 'PRD-{FEATURE}'
      }
    }
  ],
  'architecture/design/{FEATURE}': [
    {
      file: 'DSG-{FEATURE}.md',
      kind: 'dsg',
      template: 'templates/dsg.md',
      prefix: 'DSG-',
      variables: ['FEATURE'],
      frontmatterDefaults: {
        type: 'design',
        parent: 'PRD-{FEATURE}'
      }
    }
  ]
}
```

**ファイル定義のフィールド:**
- `file`: プレースホルダーを含むファイル名パターン（例：`PRD-{FEATURE}.md`）
- `kind`: `eutelo add` コマンドで使用するドキュメント種別（例：`'prd'`, `'beh'`, `'dsg'`）
- `template`: テンプレートファイルのパス
- `prefix`: ファイル名のプレフィックス（例：`PRD-`）
- `variables`: パス/ファイルで使用される変数名の配列
- `rules`: `eutelo rule`用のルールファイルパス（オプション、`eutelo rule`セクションを参照）
- `frontmatterDefaults`: フロントマターのデフォルト値：
  - `type`: ドキュメントタイプの値
  - `parent`: 親ドキュメントのID（ルートドキュメントの場合は`'/'`）

**動的パス:**
`{FEATURE}`のようなプレースホルダーを含むパスは動的パスとして扱われます。`eutelo init`実行時、これらはプレースホルダーディレクトリ（例：`__FEATURE__`）に変換されます。`--skip-dynamic-paths`を使用すると、これらのディレクトリの作成をスキップできます。

#### `scaffold`（非推奨）
> **注意:** `scaffold` 設定は非推奨です。代わりにファイル定義を含む `directoryStructure` を使用してください。`directoryStructure` のエントリは内部的に scaffold エントリに自動変換されます。

スキャフォールドIDからテンプレート設定へのマッピング：
- `id`: スキャフォールドエントリの一意の識別子
- `kind`: ドキュメント種別（例：`'prd'`, `'beh'`, `'adr'`）
- `path`: プレースホルダーを含むファイルパスパターン（例：`{FEATURE}`, `{SUB}`）
- `template`: テンプレートファイルのパス（presetのテンプレートルートまたはプロジェクトルートからの相対パス）
- `variables`: テンプレートに注入するオプションの変数
- `frontmatterDefaults`: フロントマターに自動注入される固定値（オプション）：
  - `type`: 必須。ドキュメントタイプの値（例：`'prd'`, `'behavior'`, `'design'`）。`{FEATURE}`などのテンプレート変数を使用可能。
  - `parent`: 必須。親ドキュメントのID。ルートドキュメントの場合は`'/'`を使用。`{PARENT}`や`{FEATURE}`などのテンプレート変数を使用可能。

#### `frontmatter`（オプション）
Frontmatter設定：
- `rootParentIds`: 親を持たないドキュメントIDの配列
- `schemas`: 各ドキュメント種別のスキーマ定義の配列

**フィールドタイプ:**
- `string`: テキストフィールド
- `number`: 数値フィールド
- `boolean`: ブールフィールド
- `array`: 配列フィールド
- `enum`: 列挙型フィールド（`enum`プロパティに許可値を指定）
- `date`: 日付フィールド

**フィールドオプション:**
- `required`: フィールドが必須かどうか（デフォルト: `false`）
- `enum`: 列挙型フィールドの許可値
- `relation`: 関係タイプ（`'parent'`または`'related'`）

#### `guard`（オプション）
ガード設定：
- `prompts`: プロンプトIDからプロンプト設定へのマッピング
  - `id`: プロンプトの一意の識別子
  - `templatePath`: プロンプトテンプレートファイルのパス
  - `model`: LLMモデル名（例：`'gpt-4o-mini'`, `'gpt-4o'`）
  - `temperature`: LLMの温度設定（デフォルト: モデルによって異なる）

### 例: JSON設定

```json
{
  "presets": ["@eutelo/preset-default"],
  "docsRoot": "docs",
  "scaffold": {
    "feature.prd": {
      "id": "feature.prd",
      "kind": "prd",
      "path": "product/features/{FEATURE}/PRD-{FEATURE}.md",
      "template": "_template-prd.md"
    }
  },
  "frontmatter": {
    "rootParentIds": ["PRINCIPLE-GLOBAL"],
    "schemas": [
      {
        "kind": "prd",
        "fields": {
          "id": { "type": "string", "required": true },
          "type": { "type": "string" }
        }
      }
    ]
  },
  "guard": {
    "prompts": {
      "guard.default": {
        "id": "guard.default",
        "templatePath": "prompts/guard-system.md",
        "model": "gpt-4o-mini"
      }
    }
  }
}
```

### 例: YAML設定

```yaml
presets:
  - '@eutelo/preset-default'

docsRoot: docs

directoryStructure:
  product: []
  product/features/{FEATURE}:
    - file: PRD-{FEATURE}.md
      kind: prd
      template: templates/prd.md
      prefix: PRD-
      variables: [FEATURE]
      frontmatterDefaults:
        type: prd
        parent: /

frontmatter:
  rootParentIds:
    - PRINCIPLE-GLOBAL
  schemas:
    - kind: prd
      fields:
        id:
          type: string
          required: true
        type:
          type: string

guard:
  prompts:
    guard.default:
      id: guard.default
      templatePath: prompts/guard-system.md
      model: gpt-4o-mini
```

### Presetのマージ

Euteloはpresetとローカル設定ファイルから設定をマージします：
1. デフォルトpreset（`@eutelo/preset-default`）が常に最初に読み込まれます
2. `presets`で指定された追加のpresetが順番にマージされます
3. ローカル設定ファイルがpresetの値を上書きします


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
npx eutelo align docs/**/*.md --warn-only
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
> また、以下の環境変数で設定を上書きできます：
> - `EUTELO_DOCS_ROOT`: ドキュメントルートディレクトリのパス（設定ファイルの`docsRoot`を上書き）
> - `EUTELO_TEMPLATE_ROOT`: テンプレートルートディレクトリのパス（presetのテンプレートを上書き）

### `eutelo init`

プロジェクトに Eutelo ドキュメント構造を初期化します。

```bash
pnpm exec eutelo init
pnpm exec eutelo init --dry-run  # ディレクトリを作成せずに確認
```

**オプション:**
- `--dry-run`: ディレクトリを作成せずにプレビュー
- `--config <path>`: カスタム設定ファイルパスを指定
- `--skip-dynamic-paths`: 動的パス（例：`{FEATURE}`）を含むディレクトリの作成をスキップ
- `--create-placeholders`: 動的パスに対してプレースホルダーディレクトリを作成（デフォルト：有効）

> **注意:** `--placeholder-format`オプションは削除されました。プレースホルダー形式は固定形式（`__VARIABLE__`）を使用します。

**カスタムディレクトリ構造:**

設定ファイルで`directoryStructure`を定義することでディレクトリ構造をカスタマイズできます：

```typescript
// eutelo.config.ts
export default {
  docsRoot: 'docs',
  directoryStructure: {
    'product': [],
    'product/features/{FEATURE}': [
      { file: 'PRD-{FEATURE}.md', template: 'templates/prd.md' }
    ],
    'architecture': [],
    'architecture/design/{FEATURE}': [
      { file: 'DSG-{FEATURE}.md', template: 'templates/dsg.md' }
    ]
  }
};
```

`directoryStructure`が指定されていない場合は、デフォルトの構造が使用されます。

### `eutelo add`

設定ファイルで定義されたドキュメント種別に基づいて、テンプレートからドキュメントを生成します。

ドキュメント種別は`directoryStructure`を使用して設定で定義します。`kind`を持つファイルエントリを定義すると、自動的にCLIコマンドとして利用可能になります。

**例: カスタムドキュメント種別の追加**

1. **テンプレートファイルを作成**（例: `templates/_template-custom.md`）:
```markdown
---
id: CUSTOM-{FEATURE}
type: custom
feature: {FEATURE}
---

# カスタムドキュメント: {FEATURE}
```

2. **`eutelo.config.ts`でドキュメント種別を定義**:
```typescript
export default defineConfig({
  directoryStructure: {
    'custom/{FEATURE}': [
      {
        file: 'CUSTOM-{FEATURE}.md',
        kind: 'custom',
        template: 'templates/_template-custom.md',
        prefix: 'CUSTOM-',
        variables: ['FEATURE'],
        frontmatterDefaults: {
          type: 'custom',
          parent: 'PRD-{FEATURE}'
        }
      }
    ]
  },
  frontmatter: {
    schemas: [
      {
        kind: 'custom',
        fields: {
          id: { type: 'string', required: true },
          type: { type: 'string', required: true },
          feature: { type: 'string', required: true }
        }
      }
    ]
  }
});
```

3. **カスタムコマンドを使用**:
```bash
pnpm exec eutelo add custom <feature>
```

`eutelo add custom <feature>`コマンドは、`directoryStructure`設定に基づいて自動的に生成されます。コマンドの引数は、ディレクトリパスとファイル定義で使用されるプレースホルダーによって決定されます：
- `{FEATURE}` → `<feature>`引数が必要
- `{SUB}` → `<sub>`引数が必要
- `{NAME}` → `<name>`引数が必要

**注意**: 未知のドキュメント種別（設定で定義されていない）は警告を生成しますが、検証エラーにはなりません。

### `eutelo align`

関連ドキュメント間の一貫性をチェックします。

**環境変数の設定**

`eutelo align` コマンドを使用するには、以下の環境変数を設定する必要があります。環境変数は以下のいずれかの方法で設定できます：

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
   pnpm exec eutelo align
   ```

**使用方法**

```bash
pnpm exec eutelo align                           # 一貫性チェックを実行
pnpm exec eutelo align docs/**/*.md             # 指定したドキュメントをチェック
pnpm exec eutelo align --format json             # JSON形式で出力
pnpm exec eutelo align --warn-only               # エラーでも終了コード2を返さない
pnpm exec eutelo align --fail-on-error           # 問題検出時に終了コード2を返す（デフォルト）
pnpm exec eutelo align --check <id>              # 特定のガードプロンプトIDを実行
# preset を切り替えた場合でも、設定を再解決して 1 回だけ UseCase を呼び出します
# guard プロンプトは config.guard.prompts から読み込まれるため、preset なしでは実行できません
```

**関連ドキュメント自動収集**

`eutelo align` 実行時、ドキュメントグラフに基づいて関連ドキュメント（親、子、関連ドキュメント）が自動的に収集されます。これにより、1つのドキュメントを指定するだけでドキュメント間の整合性チェックが可能になります。

```bash
# 関連ドキュメントを自動収集（デフォルト動作）
pnpm exec eutelo align docs/product/features/AUTH/PRD-AUTH.md

# 関連ドキュメント収集を無効化（指定したドキュメントのみをチェック）
pnpm exec eutelo align --no-related docs/product/features/AUTH/PRD-AUTH.md

# 探索深度を指定（デフォルト: 1）
pnpm exec eutelo align --depth=2 docs/product/features/AUTH/PRD-AUTH.md

# 深度に関係なくすべての関連ドキュメントを収集
pnpm exec eutelo align --all docs/product/features/AUTH/PRD-AUTH.md
```

**オプション:**
- `--with-related`: 関連ドキュメント収集を有効化（デフォルト）
- `--no-related`: 関連ドキュメント収集を無効化
- `--depth <n>`: 関連ドキュメント収集の探索深度を設定（デフォルト: 1）
- `--all`: 深度に関係なくすべての関連ドキュメントを収集（最大: 100ドキュメント）

### `eutelo rule`

ユーザー定義のルールに基づいて、個別のドキュメントをLLMベースで検証します。

**概要**

`eutelo rule`コマンドは、Markdown形式のルールファイルで定義されたルールに基づいてドキュメントを検証します。`eutelo align`（ドキュメント間の整合性チェック）や`eutelo lint`（静的Euteloルールのチェック）とは異なり、`eutelo rule`は個別のドキュメントをカスタムルールに対して検証することに焦点を当てています。

**環境変数の設定**

`eutelo rule`コマンドを使用するには、以下の環境変数を設定する必要があります（`eutelo align`と同じ）：

1. **`.env`ファイルを使用（推奨）**

   プロジェクトルートに`.env`ファイルを作成：

   ```bash
   EUTELO_GUARD_API_ENDPOINT=https://api.openai.com
   EUTELO_GUARD_API_KEY=your-api-key-here
   EUTELO_GUARD_MODEL=gpt-4o-mini
   ```

2. **環境変数を直接設定**

   ```bash
   export EUTELO_GUARD_API_ENDPOINT=https://api.openai.com
   export EUTELO_GUARD_API_KEY=your-api-key-here
   export EUTELO_GUARD_MODEL=gpt-4o-mini
   pnpm exec eutelo rule
   ```

**設定**

ルールファイルは`directoryStructure`の`rules`フィールドで指定します：

```typescript
// eutelo.config.ts
export default {
  directoryStructure: {
    'product/features/{FEATURE}': [
      {
        file: 'PRD-{FEATURE}.md',
        kind: 'prd',
        template: 'templates/prd.md',
        rules: 'rules/prd-validation.md'  // ルールファイルのパス
      }
    ]
  }
};
```

ルールファイルのパスは以下の形式をサポートします：
- **プロジェクトルートからの相対パス**: `rules/prd-validation.md`
- **設定ファイルからの相対パス**: `./rules/prd-validation.md`
- **絶対パス**: `/path/to/rules/prd-validation.md`

**ルールファイルの形式**

ルールファイルはYAML frontmatterを含むMarkdownファイルです：

```markdown
---
version: "1.0"
description: "PRD Validation Rules"
validationMode: "llm"  # 必須: LLMベースの検証には "llm" を指定
---

## Frontmatter Rules

### Required Fields
- `purpose`: 必須。空文字列不可
- `type`: 必須。値は `prd` であること

### Field Format
- `id`: 必須。形式: `PRD-{FEATURE}`
- `status`: 必須。値は `draft`, `review`, `approved` のいずれか

## Structure Rules

### Section Requirements
- `## Purpose` セクションが存在すること
- `## Background` セクションが存在すること

## Content Rules

### Quality Guidelines
- Purposeセクションは明確で具体的であること
- Backgroundは問題の文脈を説明していること
```

**使用方法**

```bash
# 特定のドキュメントを検証
pnpm exec eutelo rule docs/product/features/AUTH/PRD-AUTH.md

# 複数のドキュメントを検証
pnpm exec eutelo rule docs/**/*.md

# JSON形式で出力
pnpm exec eutelo rule --format=json docs/**/*.md

# CIモード（自動的にJSON形式とfail-on-errorを有効化）
pnpm exec eutelo rule --ci docs/**/*.md

# 警告のみ（ルール違反があっても終了コード1を返さない）
pnpm exec eutelo rule --warn-only docs/**/*.md
```

**オプション:**
- `[documents...]`: 検証対象のドキュメントパス（省略時はルールを持つすべてのドキュメントを検証）
- `--format <format>`: 出力形式（`text` または `json`、デフォルト: `text`）
- `--fail-on-error`: ルール違反検出時に終了コード1を返す（デフォルト: 有効）
- `--warn-only`: ルール違反があっても終了コード1を返さない
- `--ci`: CIモード（`--format=json`と`--fail-on-error`を自動有効化）
- `--config <path>`: カスタム設定ファイルのパス

**終了コード:**
- `0`: 検証成功（ルール違反なし）
- `1`: ルール違反検出（エラーまたは警告）
- `2`: システムエラー（ルールファイルが見つからない、構文エラー、LLM設定が不足しているなど）

**動作の仕組み**

1. 各ドキュメントについて、`eutelo rule`は`directoryStructure.rules`から対応するルールファイルを検索します
2. ルールファイルが見つかった場合、ルールファイルを読み込み、以下の内容を組み合わせたプロンプトを構成します：
   - Euteloシステムの共通指示
   - Eutelo標準ルール
   - ルールファイルからのユーザー定義ルール
   - ドキュメントの内容
3. 構成されたプロンプトがLLMに送信され、検証が実行されます
4. LLMの応答が解析され、ルール違反が報告されます

**注意**: `directoryStructure`定義に`rules`フィールドがないドキュメントは、検証時にスキップされます。

## 移行ガイド

削除された機能と移行手順については、[移行ガイド](docs/product/tasks/MIGRATION-GUIDE-EUTELO-FEATURE-SIMPLIFICATION.md)を参照してください。

## 開発者向け情報

このリポジトリの開発に使用するコマンドや手順については、[開発者向けドキュメント](DEVELOPERS.jp.md)を参照してください。

## CI での align 実行方法

Eutelo には、GitHub Actions で `eutelo align` を実行するための再利用ワークフローと Composite Action を用意しています。最小設定で導入したい場合は、次のいずれかを選んでください。

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
- ワークフローではグローバルインストールではなく `npm ci` + `npx eutelo align ...` を推奨します（本リポジトリの `.github/workflows/guard.yml` も同様）。
- LLM 用の環境変数は Secrets/Vars で渡し、preset やローカル設定の差し替えをしてもワークフローは変更不要です。

