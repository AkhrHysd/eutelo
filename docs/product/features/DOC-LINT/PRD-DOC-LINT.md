---
id: PRD-DOC-LINT
type: prd
feature: doc-lint
title: Document Lint & Static Frontmatter Validation 機能 PRD
purpose: >
  eutelo-docs 内の frontmatter とドキュメント構造に対して、
  LLM を用いない静的解析を提供するための lint プラグイン群を配布し、
  各プロジェクトが既存の lint パイプライン（ESLint / Biome / Remark 等）に
  無理なく統合できる仕組みを提供する。
status: draft
version: 0.1
parent: PRINCIPLE-GLOBAL
owners: ["@AkhrHysd"]
tags: ["doc-lint", "static-analysis", "frontmatter"]
last_updated: "2025-11-15"
---

# PRD-DOC-LINT  
Document Lint & Static Frontmatter Validation

---

## Purpose

Eutelo が提供する文書体系（PRD / BEH / DSG / ADR / TASK / OPS）において、  
**静的に判断可能な規則をすべて LLM 依存なしに検証** できるようにするための機能。

特に：

- frontmatter のメタデータ整合（`id`, `parent`, `purpose`, `feature`, `type` など）
- ファイル構造の整合（ディレクトリ階層と命名規則）
- 禁止構文・必須構文の検査
- Markdown の静的ルール（タイトル / 見出し / フォーマット）

など、**事前に決定可能な規則**を lint プラグインとして配布し、  
プロジェクト側の lint パイプラインに自然に組み込めるようにする。

これは doc-scaffold（構造生成）と doc-guard（内容整合）を補完し、  
**静的規則の保証**を自動化するために存在する。

---

## Background

- doc-guard（LLM）による内容整合チェックは強力であるが、  
  文書体系の多くは LLM を使わずに **静的に検証可能**。
- 現状、frontmatter の欠落や id / parent の不整合を人手で発見している。
- Eutelo を導入するプロジェクトによって linter が異なる（ESLint / Biome / Remark）。
- それぞれに合わせて lint プラグインを提供し、
  **既存 CI に自然に統合できる形** が求められる。
- エディタ統合（VS Code）も容易になる。

---

## Goals / KPI

- 静的規則の検出精度 **99.9%**  
- Eutelo 文書体系における静的違反を 100% 検出
- ESLint / Biome / Remark 用プラグインを提供
- CI 追加コスト **< 300ms**
- VS Code 上で即座に lint エラーが反映される

---

## Scope

### In Scope

- frontmatter の静的検証  
  - 必須フィールド (`id`, `purpose`, `parent`)  
  - 値の形式（ID パターン、parent パターン）  
  - type/feature の整合性
- ファイル構造・命名規則の静的検証  
  - `product/features/{FEATURE}/PRD-{FEATURE}.md`  
  - `architecture/design/{FEATURE}/DSG-{FEATURE}.md`  
- Markdown 静的ルールの検証  
  - H1 の位置  
  - Frontmatter → 本文の順序  
  - 未使用 frontmatter 識別子
- lint error / warning 表示
- ESLint / Biome / Remark / Unified 用の lint プラグイン配布
- CLI 統合：`eutelo lint` サブコマンドで lint 実行もできる
- CI モード：`eutelo lint --ci`

### Out of Scope

- ドキュメント内容（purpose の意味など）の LLM チェック  
  → doc-guard の責務
- scaffolding / 生成
  → doc-scaffold の責務
- diff 差分の扱い

---

## Requirements

### Functional Requirements (FR)

- FR-01: frontmatter の必須フィールドを検証できる  
- FR-02: id / parent / type / feature などのパターンチェックができる  
- FR-03: ファイルのディレクトリ階層と命名規則を静的に検証できる  
- FR-04: ESLint プラグインとして配布できる  
- FR-05: Biome プラグインとして配布できる  
- FR-06: Remark プラグインとして配布できる  
- FR-07: `eutelo lint` コマンドとして実行できる  
- FR-08: CI モード（--ci）で exit code を返せる  
- FR-09: VS Code と統合可能（ESLint / Biome 経由）  
- FR-10: 非破壊・読み取り専用

### Non-Functional Requirements (NFR)

- NFR-01: 実行速度は 300ms 未満  
- NFR-02: Node.js 18+ サポート  
- NFR-03: エラーは具体的に「パス／種別／修正案」を提示  
- NFR-04: CLI と linter プラグインで共通の core 検証ロジックを使用  
- NFR-05: Eutelo 文書体系の将来拡張に耐えられるモジュール構造

---

## Success Criteria

- LLM を使わずに検証可能な静的ルールのすべてが自動検出される  
- 既存プロジェクトの linter に自然に統合される  
- CI で静的違反が即検出される  
- 人手による frontmatter / file naming のチェックが不要になる  
- Eutelo 文書体系の「静的整合性」が確実に維持される

---

## Dependencies / Related

- Behavior: `../doc-lint/BEH-doc-lint.md`  
- Design: `../../architecture/design/doc-lint/DSG-doc-lint.md`  
- ADR: `../../architecture/adr/doc-lint/ADR-doc-lint-0001.md`  
- Principle: `../../../philosophy/principles/global-principles.md`  
- doc-scaffold（構造） / doc-guard（内容）と連携

---

## Risks / Assumptions

- 各プロジェクトの linter プラグイン形式が異なるため  
  adapter 必要性が高い  
- frontmatter の自由度が高い場合、静的解析の限界がある  
- Markdown parser のバージョン違いによる差異

---

## Notes

- 静的に判断できるものはすべて doc-lint の責務に寄せることで  
  doc-guard（LLM）を軽くし、性能と安定性を両立させる。
- ESLint / Biome / Remark などの lint 文化に自然に乗ることで  
  開発者体験の向上が期待できる。

---

## References

- Eutelo Document Principles  
- YAML Frontmatter 標準  
- Unified / Remark 仕様  
- Biome Plugin API  
- ESLint Plugin API

---