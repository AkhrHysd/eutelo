---
id: DSG-DOC-LINT
type: dsg
feature: doc-lint
title: Document Lint & Static Frontmatter Validation 設計ガイド（最終版）
purpose: >
  Eutelo 文書体系における frontmatter およびファイル構造の静的ルールを
  LLM を使わずに検証する lint 基盤を設計する。
  静的解析ロジックは Core に集約し、ESLint / Biome / CLI から利用できる
  薄いアダプタとして配布する。
status: draft
version: 0.2
parent: PRD-DOC-LINT
owners: ["@AkhrHysd"]
last_updated: "2025-11-16"
---

# DSG-DOC-LINT  
Document Lint & Static Analysis 設計ガイド（ESLint / Biome プラグイン統合版）

---

## 1. 概要

本 DSG は、PRD-DOC-LINT および BEH-DOC-LINT の要求を実現するために  
**静的解析ロジックを Core に一本化し、ESLint / Biome / CLI から利用可能にする設計** を定義する。

doc-lint は以下の責務を持つ：
 
- ディレクトリ構造（product/features/... など）の検証  
- ファイル命名規則の検証  
- Markdown の基本構造（frontmatter → 本文、H1 の有無）の検証  
- ESLint / Biome プラグインとして導入できる形で配布  
- CLI（`eutelo lint`）でも同じロジックを実行可能

remark/unified などは **将来的な拡張候補** とする。

---

## 2. スコープ

### In Scope

- frontmatter 構文の静的解析（YAML → オブジェクト）
- 必須フィールド検証（id / parent / type / feature / purpose）
- 不正 / 未知フィールド検出
- ファイル構造・命名規則の静的検証
- Markdown 構造（H1、frontmatter順序）
- ESLint プラグイン実装
- Biome プラグイン実装
- CLI 実装（`eutelo lint`）
- 共通 RuleEngine の実装

### Out of Scope

- LLM による意味的整合性検証  
  → doc-guard の責務  
- テンプレート生成  
  → doc-scaffold の責務  
- diff ベースの解析（将来拡張）

---

## 3. アーキテクチャ

### 3.1 全体構造

```
packages/
  core/
    doc-lint/
      index.ts
      rules/
      FrontmatterParser.ts
      StructureAnalyzer.ts
      RuleEngine.ts

  plugins/
    eslint/
      index.js
      rules/
    biome/
      index.js

  cli/
    lint/
      LintCommand.ts
```

### 3.2 Core は “Single Source of Truth”

- RuleEngine で全ルールを定義（純関数＋高速）
- ESLint / Biome / CLI は **Core を直接呼び出すだけ**
- ルール変更は Core 側のみで完結

---

## 4. モジュール構成（Core）

### 4.1 FrontmatterParser

- YAML frontmatter の抽出  
- 先頭以外にあれば即エラー  
- 未知 key の検出のため、全キー列挙  
- strict mode: `id/type/feature/purpose/parent` の必須性を検証

```ts
type ParsedFrontmatter = {
  id: string;
  parent?: string;
  type: string;
  feature?: string;
  purpose?: string;
  raw: string;
}
```

---

### 4.2 StructureAnalyzer

- ファイルパス → 期待される type / feature / idPattern を推定
- frontmatter の実値との整合性を判定
- 構造規則は Eutelo Directory Guide に準拠

例：

```
eutelo-docs/product/features/auth/PRD-AUTH.md
 → expected type = prd
 → expected feature = auth
 → expected idPattern = PRD-AUTH
```

---

### 4.3 RuleEngine

- input: `ParsedDocument { path, frontmatter, inferred }`
- output: `LintResult { errors: Issue[], warnings: Issue[] }`

ルールは純関数として実装：

- ruleRequiredFields  
- ruleIdFormat  
- ruleParentExists  
- ruleTypeMatchesPath  
- ruleUnknownFields  
- ruleFrontmatterTop  
- ruleHasH1Heading  

---

## 5. ESLint プラグイン設計

### 5.1 役割

- `.md` / `.mdx` に対して doc-lint Core を呼び出し  
- Core の Issue を ESLint の context.report に変換

### 5.2 推奨設定

```json
{
  "plugins": ["eutelo-docs"],
  "overrides": [
    {
      "files": ["eutelo-docs/**/*.md"],
      "extends": ["plugin:eutelo-docs/recommended"]
    }
  ]
}
```

### 5.3 adapter の責務

- Core の `LintIssue` → ESLint の format に変換
- エラー行は frontmatter の該当 key か H1 付近を推定

---

## 6. Biome プラグイン設計

### 6.1 役割

- Biome の plugin API に合わせ、Core の `LintResult` を Biome の Diagnostics 形式へ変換

### 6.2 推奨設定（biome.json）

```json
{
  "extends": ["@eutelo/biome-doc-lint/recommended"]
}
```

### 6.3 adapter の責務

- ESLint と同様、Core の output を Biome Diagnostics に変換するだけ

---

## 7. CLI: `eutelo lint`

### 7.1 フロー

```
対象ファイル列挙 → Core RuleEngine → 表示 → exit code 制御
```

### 7.2 オプション

- `--ci` : exit 1 で CI fail  
- `--format=json` : JSON で出力  
- `--paths` : カスタム対象

### 7.3 exit code

- 0: 問題なし  
- 1: 静的違反あり  

---

## 8. パフォーマンス設計

- frontmatter のみ抽出 → Markdown 全文 parse 不要  
- StructureAnalyzer は正規表現ベースで高速  
- ルールはすべて純関数  
- ファイルキャッシュを簡易実装し、CI 全体 < 300ms を保証

---

## 9. エラー・UX

### 9.1 CLI 出力例

```
eutelo-docs/product/features/auth/PRD-AUTH.md
  EUTL001: Missing required field "purpose"
  hint: Add 'purpose' to frontmatter.
```

### 9.2 ESLint 出力例

```
PRD-AUTH.md
  1:1  error  EUTL001  Missing required field "purpose"
```

### 9.3 Biome 出力例

Biome Diagnostic 形式に準拠。

---

## 10. 拡張方針

- remark/unified adapter は将来 optional で提供  
- doc-scaffold のテンプレ差分チェックとの連携  
- diff フォーカス lint（将来）

---

## 11. Definition of Done

- PRD / BEH が要求する静的ルールすべてを RuleEngine が検出する  
- ESLint / Biome / CLI のすべてが共通 Core を利用  
- CI で高速に動作し、exit code により判断可能  
- エディタ統合（ESLint / Biome）が自然に動作する  

---