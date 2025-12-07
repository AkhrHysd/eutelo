---
id: DSG-DOC-RULE-VALIDATION
type: dsg
feature: doc-rule-validation
title: Document Rule Validation 設計ガイド
purpose: >
  ユーザーが定義したルール（Markdownファイル）に基づいてドキュメント自体を検証する機能の
  内部設計方針を定義する。ルールファイルの構文、パス解決、検証ロジック、CLI統合を明確化する。
status: draft
version: 0.1
parent: PRD-DOC-RULE-VALIDATION
owners: ["@AkhrHysd"]
last_updated: "2025-01-27"
---

# DSG-DOC-RULE-VALIDATION  
Design Specification Guide — Document Rule Validation

---

## 1. 概要

Document Rule Validation（doc-rule-validation）は、`eutelo-docs/` 内の個々のドキュメントが  
**ユーザーが定義したルール（Markdownファイル）に準拠しているか**を検証する仕組みを提供する。

`eutelo guard` がドキュメント間の整合性を AI（LLM）で検証するのに対し、  
本機能は個々のドキュメント自体がユーザー定義のルールに準拠しているかを検証する。

`eutelo lint` が Eutelo 標準の静的ルールを検証するのに対し、  
本機能はプロジェクト固有のカスタムルールを定義・適用できる。

本機能は以下の2つの検証モードをサポートする：

1. **静的検証モード**: ルールファイルに定義された静的ルール（frontmatter、構造など）を検証
2. **LLM検証モード**: LLMを使用して、ユーザー定義ルールとEutelo標準ルールを組み合わせた検証を実行

本 DSG では以下を明確化する：

- CLI アーキテクチャ  
- ルールファイルの構文設計  
- ルールファイルの読み込み・解析  
- ルールファイルのパス解決  
- ドキュメント検証ロジック（静的検証とLLM検証の両方）
- LLM検証のためのプロンプト設計と合成
- プロンプトファイルの分割と管理
- エラー設計・exit code 設計  
- CI 連携方式

---

## 2. アーキテクチャ構成

doc-rule-validation は既存の構造（cli/core/distribution）と同一パターンを踏襲する。

```
packages/
  cli/
    src/
      index.ts          # eutelo validate コマンド
  core/
    src/
      rule-validation/
        RuleValidationService.ts
        RuleFileLoader.ts
        RuleParser.ts
        DocumentValidator.ts
        LLMValidator.ts          # LLM検証モード用
        PromptComposer.ts        # プロンプト合成用
        IssueFormatter.ts
  distribution/
    templates/
      rules/            # ルールファイルテンプレート（将来拡張）
    prompts/
      rule-validation/  # プロンプトファイル
        common.md       # 共通プロンプト（Eutelo標準のドキュメント体系説明）
        eutelo-rules.md # Eutelo標準ルールプロンプト
```

### 2.1 CLI レイヤー（packages/cli）

責務：

- 引数パース（`--format=json`, `--fail-on-error`, `--warn-only`, `--ci`）
- ドキュメントパスの受け取り（`eutelo validate [documents...]`）
- RuleValidationService の呼び出し
- exit code のマッピング
- ログ整形（人間向け / CI 向け）

### 2.2 Core レイヤー（packages/core）

#### **RuleValidationService**
doc-rule-validation の中心となるサービス。

責務：

1. 設定ファイルから `directoryStructure` を読み込み
2. 各ファイル定義の `rules` フィールドからルールファイルパスを取得
3. RuleFileLoader でルールファイルを読み込み
4. RuleParser でルールファイルを解析
5. DocumentValidator でドキュメントを検証
6. IssueFormatter によるレポート生成
7. CLI に返すための「validation result」を返却

#### **RuleFileLoader**
- ルールファイルのパス解決（プロジェクトルート、設定ファイルからの相対パス、presetからの相対パス）
- ルールファイルの読み込み
- ルールファイルが存在しない場合のエラーハンドリング

#### **RuleParser**
- ルールファイル（Markdown）の構文解析
- ルールの構造化（後述のルール構文に基づく）
- ルールファイルの構文エラー検出

#### **DocumentValidator**
- ルールに基づくドキュメント検証（静的検証モード）
- frontmatter の検証
- ドキュメント構造の検証
- ドキュメント内容の検証（将来拡張）

#### **LLMValidator**
- LLMを使用したドキュメント検証（LLM検証モード）
- PromptComposer で合成されたプロンプトをLLMに送信
- LLMの応答を解析し、検証結果を構造化

#### **PromptComposer**
- 複数のプロンプトファイルを読み込み、合成する
- 共通プロンプト、Eutelo標準ルール、ユーザー定義ルールを組み合わせる
- プロンプトの優先順位と合成順序を管理

#### **IssueFormatter**
- CLI 表示用
- CI JSON 出力用  
の整形を行う。

---

## 3. ルールファイルの構文設計

### 3.1 基本構造

ルールファイルは Markdown 形式で記述し、YAML frontmatter とルール定義セクションで構成する。

```markdown
---
version: "1.0"
description: "PRD ドキュメントの検証ルール"
---

# PRD Validation Rules

## Frontmatter Rules

### Required Fields
- `id`: 必須。形式: `PRD-{FEATURE}`
- `type`: 必須。値: `prd`
- `purpose`: 必須。空文字列不可
- `parent`: 必須。ルートドキュメントは `/`

### Field Validation
- `status`: 必須。値は `draft`, `review`, `approved` のいずれか
- `version`: 必須。形式: `X.Y` または `X.Y.Z`

## Structure Rules

### Heading Structure
- H1 見出しが存在すること
- H1 見出しの形式: `# PRD-{FEATURE}`

### Section Requirements
- `## Purpose` セクションが存在すること
- `## Background` セクションが存在すること
- `## Requirements` セクションが存在すること

## Content Rules

### Minimum Length
- `Purpose` セクションの内容は 50 文字以上
- `Background` セクションの内容は 100 文字以上
```

### 3.2 ルール定義の形式

ルールは以下のカテゴリに分類される：

1. **Frontmatter Rules**: frontmatter の検証ルール
2. **Structure Rules**: ドキュメント構造の検証ルール
3. **Content Rules**: ドキュメント内容の検証ルール（将来拡張）

各ルールは以下の形式で記述：

```markdown
## {Category} Rules

### {Rule Name}
- ルールの説明
- 検証条件
- エラーメッセージ（オプション）
```

### 3.3 ルールの解析

RuleParser は Markdown を解析し、以下の構造に変換：

```typescript
type RuleDefinition = {
  version: string;
  description: string;
  frontmatterRules: FrontmatterRule[];
  structureRules: StructureRule[];
  contentRules: ContentRule[];
};

type FrontmatterRule = {
  name: string;
  type: 'required' | 'format' | 'enum' | 'custom';
  field: string;
  condition?: string;
  message?: string;
};

type StructureRule = {
  name: string;
  type: 'heading' | 'section' | 'order';
  condition: string;
  message?: string;
};
```

---

## 4. ルールファイルのパス解決

### 4.1 パス解決の優先順位

`directoryStructure` の `rules` フィールドで指定されたパスは、以下の順序で解決される：

1. **絶対パス**: `/path/to/rules/prd-validation.md` → そのまま使用
2. **プロジェクトルートからの相対パス**: `rules/prd-validation.md` → `{cwd}/rules/prd-validation.md`
3. **設定ファイルからの相対パス**: `./validation-rules/prd.md` → `{configDir}/validation-rules/prd.md`
4. **preset パッケージ内のルールファイル**: `@eutelo/preset-default/rules/prd.md` → preset パッケージ内を検索（将来拡張）

### 4.2 パス解決の実装

```typescript
class RuleFileLoader {
  resolveRulePath(
    rulePath: string,
    configPath: string,
    cwd: string,
    presets: string[]
  ): string {
    // 1. 絶対パスの場合
    if (path.isAbsolute(rulePath)) {
      return rulePath;
    }
    
    // 2. preset パッケージの場合（将来拡張）
    if (rulePath.startsWith('@')) {
      return this.resolvePresetPath(rulePath, presets);
    }
    
    // 3. 相対パスの場合
    if (rulePath.startsWith('./')) {
      // 設定ファイルからの相対パス
      return path.resolve(path.dirname(configPath), rulePath);
    }
    
    // 4. プロジェクトルートからの相対パス
    return path.resolve(cwd, rulePath);
  }
}
```

---

## 5. LLM検証モードとプロンプト設計

### 5.1 LLM検証モードの概要

LLM検証モードは、ユーザー定義ルールとEutelo標準ルールを組み合わせて、  
LLMにドキュメントの検証を依頼する機能である。

静的検証モードでは検証できない、以下のような柔軟な検証が可能：

- ドキュメント内容の意味的整合性
- セクション間の論理的つながり
- プロジェクト固有の品質基準
- 自然言語によるルール定義

### 5.2 プロンプトの分割設計

プロンプトは以下の3つの部分に分割し、それぞれを独立したファイルとして管理する：

1. **共通プロンプト（common.md）**: Eutelo標準のドキュメント体系の説明
2. **Eutelo標準ルールプロンプト（eutelo-rules.md）**: Euteloの暗黙的なドキュメントルール
3. **ユーザー定義ルールプロンプト**: ユーザーが指定したルールファイル（Markdown形式）

#### 5.2.1 共通プロンプト（common.md）

Eutelo標準のドキュメント体系について説明するプロンプト。

**配置場所**:
- `packages/distribution/prompts/rule-validation/common.md`（preset-default）
- プロジェクト側で上書き可能: `prompts/rule-validation/common.md`

**内容例**:
```markdown
You are a documentation validator for the Eutelo documentation system.

Eutelo uses a structured documentation system with the following document types:
- PRD (Product Requirements Document): Defines what the product should do
- BEH (Behavior Specification): Defines how the product behaves
- DSG (Design Specification Guide): Defines the technical design
- ADR (Architecture Decision Record): Records architectural decisions
- TASK: Implementation task breakdown
- OPS: Operational runbooks

Key relationships:
- Documents reference each other via "parent" field
- Child documents should align with parent document's purpose and scope
```

#### 5.2.2 Eutelo標準ルールプロンプト（eutelo-rules.md）

Euteloの暗黙的なドキュメントルールを定義するプロンプト。

**配置場所**:
- `packages/distribution/prompts/rule-validation/eutelo-rules.md`（preset-default）
- プロジェクト側で上書き可能: `prompts/rule-validation/eutelo-rules.md`

**内容例**:
```markdown
## Eutelo Standard Document Rules

### Frontmatter Rules
- All documents must have `id`, `type`, `purpose`, and `parent` fields
- `id` must follow the pattern: `{TYPE}-{FEATURE}` (e.g., `PRD-AUTH`)
- `parent` must be `/` for root documents or a valid document ID

### Structure Rules
- PRD documents must have `## Purpose`, `## Background`, and `## Requirements` sections
- BEH documents must have `## Feature` section with Gherkin-style scenarios
- DSG documents must have `## 1. 概要` section

### Content Rules
- Purpose section must be at least 50 characters
- Background section must explain the problem or context
- Requirements section must be specific and measurable
```

#### 5.2.3 ユーザー定義ルールプロンプト

ユーザーが `directoryStructure` の `rules` フィールドで指定したルールファイル。

**配置場所**:
- プロジェクト側で自由に配置可能
- 設定ファイルの `rules` フィールドでパスを指定

**内容例**:
```markdown
## Custom Validation Rules

### Project-Specific Rules
- All PRD documents must include a "## Success Criteria" section
- Purpose section must mention the target user persona
- Background section must reference at least one related issue or discussion
```

### 5.3 プロンプトの合成

PromptComposer は以下の順序でプロンプトを合成する：

```
1. 共通プロンプト（common.md）
   ↓
2. Eutelo標準ルールプロンプト（eutelo-rules.md）
   ↓
3. ユーザー定義ルールプロンプト（rules フィールドで指定）
   ↓
4. ドキュメント内容（frontmatter + 本文）
   ↓
5. 検証タスク指示（期待される出力形式など）
```

**合成例**:
```markdown
[共通プロンプトの内容]

---

[Eutelo標準ルールプロンプトの内容]

---

[ユーザー定義ルールプロンプトの内容]

---

## Document to Validate

[ドキュメントのfrontmatterと本文]

---

## Validation Task

Please validate the above document against all the rules defined above.
Respond in JSON format with the following structure:
{
  "issues": [...],
  "warnings": [...],
  "suggestions": [...]
}
```

### 5.4 プロンプトファイルのパス解決

プロンプトファイルのパス解決は、ルールファイルと同様の優先順位で行う：

1. **絶対パス**: `/path/to/prompts/common.md` → そのまま使用
2. **プロジェクトルートからの相対パス**: `prompts/rule-validation/common.md` → `{cwd}/prompts/rule-validation/common.md`
3. **preset パッケージ内のプロンプト**: `@eutelo/preset-default/prompts/rule-validation/common.md` → preset パッケージ内を検索

### 5.5 LLM検証モードの有効化

LLM検証モードは、ルールファイルの frontmatter で `validationMode: "llm"` を指定することで有効化される。

```markdown
---
version: "1.0"
description: "PRD ドキュメントの検証ルール"
validationMode: "llm"  # "static" または "llm"
model: "gpt-4o-mini"   # LLM検証モードの場合のみ
temperature: 0.2      # LLM検証モードの場合のみ
---
```

静的検証モードとLLM検証モードは、同じルールファイル内で併用することも可能（将来的な拡張）。

---

## 6. ドキュメント検証フロー

### 6.1 静的検証モードのフロー

```
設定ファイル読み込み
    ↓
directoryStructure から rules フィールドを取得
    ↓
RuleFileLoader でルールファイルを読み込み
    ↓
RuleParser でルールファイルを解析
    ↓
DocumentValidator でドキュメントを検証（静的）
    ↓
IssueFormatter が CLI/JSON 形式に整形
    ↓
CLI が exit code 返却
```

### 6.2 LLM検証モードのフロー

```
設定ファイル読み込み
    ↓
directoryStructure から rules フィールドを取得
    ↓
RuleFileLoader でルールファイルを読み込み
    ↓
RuleParser でルールファイルを解析
    ↓
PromptComposer でプロンプトを合成
  - 共通プロンプト（common.md）を読み込み
  - Eutelo標準ルール（eutelo-rules.md）を読み込み
  - ユーザー定義ルールを読み込み
  - ドキュメント内容を注入
  - 検証タスク指示を追加
    ↓
LLMValidator でLLMに検証を依頼
    ↓
LLMの応答を解析
    ↓
IssueFormatter が CLI/JSON 形式に整形
    ↓
CLI が exit code 返却
```

### 6.3 検証の実行順序

#### 静的検証モードの場合

1. **ルールファイルの読み込み・解析**
   - ルールファイルが存在するか確認
   - ルールファイルの構文が正しいか確認
   - ルール定義を構造化

2. **ドキュメントの読み込み**
   - 指定されたドキュメントを読み込み
   - frontmatter と本文を分離

3. **ルール適用**
   - Frontmatter Rules を適用
   - Structure Rules を適用
   - Content Rules を適用（将来拡張）

4. **結果の集約**
   - 検証結果を集約
   - エラー・警告・提案に分類

#### LLM検証モードの場合

1. **プロンプトファイルの読み込み**
   - 共通プロンプト（common.md）を読み込み
   - Eutelo標準ルール（eutelo-rules.md）を読み込み
   - ユーザー定義ルールファイルを読み込み

2. **ドキュメントの読み込み**
   - 指定されたドキュメントを読み込み
   - frontmatter と本文を分離

3. **プロンプトの合成**
   - PromptComposer でプロンプトを合成
   - 共通プロンプト + Eutelo標準ルール + ユーザー定義ルール + ドキュメント内容 + タスク指示

4. **LLM検証の実行**
   - LLMClient でLLM APIを呼び出し
   - LLMの応答を解析

5. **結果の集約**
   - 検証結果を集約
   - エラー・警告・提案に分類

---

## 7. PromptComposer の実装設計

### 7.1 PromptComposer の責務

- 複数のプロンプトファイルを読み込み、合成する
- プロンプトの優先順位と合成順序を管理
- プロンプトファイルのパス解決
- プロンプトのキャッシュ（パフォーマンス向上）

### 7.2 プロンプト合成の実装

```typescript
class PromptComposer {
  async composePrompt(options: ComposePromptOptions): Promise<string> {
    const {
      commonPromptPath,
      euteloRulesPath,
      userRulePath,
      document,
      validationMode
    } = options;

    // 1. 共通プロンプトを読み込み
    const commonPrompt = await this.loadPrompt(commonPromptPath);
    
    // 2. Eutelo標準ルールを読み込み
    const euteloRules = await this.loadPrompt(euteloRulesPath);
    
    // 3. ユーザー定義ルールを読み込み（存在する場合）
    const userRules = userRulePath 
      ? await this.loadPrompt(userRulePath)
      : '';
    
    // 4. ドキュメント内容をフォーマット
    const documentContent = this.formatDocument(document);
    
    // 5. 検証タスク指示を生成
    const taskInstruction = this.buildTaskInstruction(validationMode);
    
    // 6. プロンプトを合成
    return this.combinePrompts({
      commonPrompt,
      euteloRules,
      userRules,
      documentContent,
      taskInstruction
    });
  }

  private combinePrompts(parts: PromptParts): string {
    const sections: string[] = [];
    
    // 共通プロンプト
    if (parts.commonPrompt) {
      sections.push(parts.commonPrompt);
    }
    
    // Eutelo標準ルール
    if (parts.euteloRules) {
      sections.push('---\n## Eutelo Standard Rules\n---\n');
      sections.push(parts.euteloRules);
    }
    
    // ユーザー定義ルール
    if (parts.userRules) {
      sections.push('---\n## Custom Validation Rules\n---\n');
      sections.push(parts.userRules);
    }
    
    // ドキュメント内容
    sections.push('---\n## Document to Validate\n---\n');
    sections.push(parts.documentContent);
    
    // 検証タスク指示
    sections.push('---\n## Validation Task\n---\n');
    sections.push(parts.taskInstruction);
    
    return sections.join('\n\n');
  }
}
```

### 7.3 プロンプトファイルの読み込み

プロンプトファイルの読み込みは、RuleFileLoader と同様のパス解決ロジックを使用する。

```typescript
class PromptComposer {
  private async loadPrompt(promptPath: string): Promise<string> {
    // パス解決（RuleFileLoader と同様のロジック）
    const resolvedPath = this.resolvePromptPath(promptPath);
    
    // ファイル読み込み
    const content = await fs.readFile(resolvedPath, 'utf8');
    
    // キャッシュに保存（オプション）
    this.promptCache.set(resolvedPath, content);
    
    return content;
  }
}
```

---

## 8. エラー設計・exit code 設計

### 6.1 exit code 設計

| code | 意味 |
|------|------|
| 0 | 検証成功（ルール違反なし） |
| 1 | ルール違反あり（エラーまたは警告） |
| 2 | システムエラー（ルールファイル読み込み失敗、構文エラーなど） |

### 6.2 エラーの分類

- **Error**: ルール違反（必須項目の欠落、形式エラーなど）
- **Warning**: 推奨事項の未遵守（将来拡張）
- **System Error**: ルールファイルの読み込み失敗、構文エラーなど

### 6.3 `--fail-on-error` と `--warn-only` の動作

- `--fail-on-error`（デフォルト）: Error がある場合、exit code 1 を返す
- `--warn-only`: Warning のみの場合は exit code 0、Error がある場合は exit code 1

---

## 9. CLI オプション設計

### 7.1 基本オプション

- `eutelo validate [documents...]`: 検証対象のドキュメントを指定（未指定の場合は設定から自動検出）
- `--format <format>`: 出力形式（`text` または `json`、デフォルト: `text`）
- `--fail-on-error`: エラー時に exit code 1 を返す（デフォルト: 有効）
- `--warn-only`: 警告のみの場合は exit code 0 を返す
- `--ci`: CI モード（`--format=json` と `--fail-on-error` を自動有効化）
- `--config <path>`: 設定ファイルのパス

### 7.2 出力形式

#### Text 形式（デフォルト）

```
new-docs/spec/AAA/PRD-AAA.md
  Error: Missing required field "purpose"
    Rule: Frontmatter Rules > Required Fields
    Hint: Add 'purpose' field to frontmatter.

new-docs/spec/AAA/PRD-AAA.md
  Error: Invalid format for field "id"
    Rule: Frontmatter Rules > Field Validation
    Expected: PRD-{FEATURE}
    Actual: PRD-AAA
```

#### JSON 形式

```json
{
  "summary": {
    "total": 1,
    "errors": 1,
    "warnings": 0
  },
  "results": [
    {
      "file": "new-docs/spec/AAA/PRD-AAA.md",
      "issues": [
        {
          "severity": "error",
          "rule": "Frontmatter Rules > Required Fields",
          "message": "Missing required field \"purpose\"",
          "hint": "Add 'purpose' field to frontmatter."
        }
      ]
    }
  ]
}
```

---

## 10. 設定ファイルとの統合

### 8.1 `directoryStructure` からのルール取得

設定ファイルの `directoryStructure` から、各ファイル定義の `rules` フィールドを取得し、  
対応するドキュメント種別（kind）にルールを適用する。

```typescript
// 設定例
{
  "directoryStructure": {
    "spec/{FEATURE}": [
      {
        "file": "PRD-{FEATURE}.md",
        "kind": "prd",
        "rules": "rules/prd-validation.md"  // ← このルールが適用される
      }
    ]
  }
}
```

### 8.2 ルールの適用対象

- ドキュメントの `kind` が一致する場合、対応するルールファイルを適用
- 複数のファイル定義で同じ `kind` が指定されている場合、最初に見つかったルールを適用
- `rules` フィールドが指定されていない場合、その `kind` のドキュメントは検証スキップ

---

## 11. パフォーマンス設計

- ルールファイルの読み込み・解析は初回のみ実行し、結果をキャッシュ
- ドキュメントの読み込みは必要最小限（frontmatter のみ、または全文）
- 検証ロジックは純関数として実装し、並列実行可能にする
- ルールファイルの読み込み・解析時間 < 100ms
- ドキュメント検証の実行時間 < 1秒（ルール数に依存）

---

## 12. 拡張方針

### 10.1 ルール構文の拡張

- YAML frontmatter を含む Markdown 形式のサポート
- より高度なルール定義（正規表現、カスタム関数など）
- ルールの組み合わせ（AND / OR 条件）

### 10.2 検証ロジックの拡張

- ドキュメント内容の検証（特定のキーワードの存在、セクションの順序など）
- 外部ツールとの統合（markdownlint、textlint など）
- カスタムバリデーター関数のサポート

### 10.3 preset パッケージからのルール提供

- preset パッケージにデフォルトルールを同梱
- プロジェクト側でルールを上書き可能

---

## 13. セキュリティ設計

- ルールファイルのパス解決時に、プロジェクト外のファイルへのアクセスを制限
- ルールファイルの実行権限は読み取り専用
- ルールファイルの内容をログに出力しない（機密情報が含まれる可能性）

---

## 14. エラー・UX

### 12.1 CLI 出力例（正常系）

```
✓ Validated 3 documents
  ✓ new-docs/spec/AAA/PRD-AAA.md
  ✓ new-docs/spec/AAA/BEH-AAA.md
  ✓ new-docs/spec/AAB/PRD-AAB.md
```

### 12.2 CLI 出力例（エラーあり）

```
✗ Validated 3 documents, found 2 errors

new-docs/spec/AAA/PRD-AAA.md
  ✗ Error: Missing required field "purpose"
    Rule: Frontmatter Rules > Required Fields
    Hint: Add 'purpose' field to frontmatter.

new-docs/spec/AAA/BEH-AAA.md
  ✗ Error: Invalid format for field "id"
    Rule: Frontmatter Rules > Field Validation
    Expected: BEH-{FEATURE}
    Actual: BEH-AAA
```

### 12.3 ルールファイルエラー

```
✗ Failed to load rule file: rules/prd-validation.md
  Error: File not found
  Hint: Check the path in directoryStructure.rules
```

---

## 15. Definition of Done

- PRD / BEH が要求する機能要件すべてが実装されている
- `directoryStructure` の `rules` フィールドからルールファイルを読み込み、適用できる
- `eutelo validate [documents...]` コマンドでルール違反を検出できる
- CI でルール違反を自動検出し、PR の段階で阻止できる
- JSON 形式で詳細レポートが得られ、PR コメントにも転記しやすい
- 設定（fail / warn）に応じて適切に exit code が制御される
- ルールファイルの構文エラーを適切に検出・報告できる
- ルールファイルのパス解決が正しく動作する（相対パス・絶対パス）
- LLM検証モードが正しく動作し、プロンプトが適切に合成される
- 共通プロンプト、Eutelo標準ルール、ユーザー定義ルールが正しく読み込まれ、合成される
- プロンプトファイルのパス解決が正しく動作する

---

