---
id: PRD-DOC-RULE-VALIDATION
type: prd
feature: doc-rule-validation
title: Document Rule Validation 機能 PRD
purpose: >
  ユーザーが定義したルール（Markdownファイル）に基づいてドキュメント自体を検証する機能を提供する。
  eutelo guard がドキュメント間の整合性を検証するのに対し、本機能は個々のドキュメントが
  ユーザー定義のルールに準拠しているかを検証する。
status: draft
version: 0.1
parent: PRINCIPLE-GLOBAL
owners: ["@AkhrHysd"]
tags: ["doc-rule-validation", "custom-rules", "document-validation"]
last_updated: "2025-01-27"
---

# PRD-DOC-RULE-VALIDATION  
Document Rule Validation

---

## Purpose

本機能は、`eutelo-docs/` 内の個々のドキュメントが  
**ユーザーが定義したルール（Markdownファイル）に準拠しているか**を検証する仕組みを提供する。

これにより：

- プロジェクト固有のドキュメント品質基準を定義・強制できる
- ドキュメント構造や内容に関するカスタムルールを適用できる
- CI/CD パイプラインに統合して、ルール違反を自動検出できる
- ドキュメント作成者がルールに従っているかを確認できる

`eutelo guard`（ドキュメント間の整合性検証）と `eutelo lint`（静的ルール検証）を補完し、  
**ユーザー定義ルールによる柔軟な検証**を可能にする。

---

## Background

- `eutelo guard` はドキュメント間の整合性を LLM で検証するが、  
  個々のドキュメント自体が特定のルールに従っているかの検証は行わない。
- `eutelo lint` は Eutelo 標準の静的ルールを検証するが、  
  プロジェクト固有のルールを定義・適用する仕組みがない。
- プロジェクトごとに異なるドキュメント品質基準や構造要件がある。
- ユーザーが Markdown ファイルとしてルールを定義し、  
  それをドキュメント検証に適用できる仕組みが必要。

---

## Goals / KPI

- ユーザー定義ルールの適用率 **100%**
- ルールファイルの読み込み・解析時間 **< 100ms**
- ドキュメント検証の実行時間 **< 1秒**（ルール数に依存）
- CI での適用率 **100%**
- ルール違反の検出精度 **> 95%**

---

## Scope

### In Scope

- ユーザー定義ルールファイル（Markdown）の読み込み・解析
- `directoryStructure` のファイル定義に `rules` フィールドでルールファイルパス（相対パスまたは絶対パス）を指定
  - 例: `"rules": "rules/prd-validation.md"` または `"rules": "./validation-rules/prd.md"`
- ルールファイルに基づくドキュメント検証ロジック
- CLI コマンド: `eutelo validate [documents...]` または `eutelo check [documents...]`
- ルール違反の検出とレポート出力
- CI 用オプション: `--ci`, `--json`, `--fail-on-error`, `--warn-only`
- 複数のルールファイルの適用（1つのファイル定義に複数のルールを適用可能）
- ルールファイルの構文定義とバリデーション
- ルールファイルのパス解決（プロジェクトルート、設定ファイルからの相対パス、presetからの相対パス）

### Out of Scope

- ドキュメント間の整合性検証  
  → `eutelo guard` の責務
- Eutelo 標準の静的ルール検証  
  → `eutelo lint` の責務
- ルールファイルの自動生成
- LLM によるルール解釈（ルールは構造化された形式で定義）
- ドキュメントの自動修正（検証のみ）

---

## Requirements

### Functional Requirements (FR)

- **FR-01**: `directoryStructure` のファイル定義に `rules` フィールドでルールファイルパスを指定できる
- **FR-02**: ルールファイル（Markdown）を読み込み、解析できる
- **FR-03**: ルールファイルに基づいてドキュメントを検証できる
- **FR-04**: `eutelo validate [documents...]` コマンドで検証を実行できる
- **FR-05**: 複数のルールファイルを適用できる
- **FR-06**: ルール違反を検出し、詳細なレポートを出力できる
- **FR-07**: CI モード（`--ci`, `--json`）で実行できる
- **FR-08**: exit code で検証結果を表現できる（0: 成功, 1: ルール違反, 2: エラー）
- **FR-09**: ルールファイルの構文エラーを検出できる
- **FR-10**: ルールファイルが存在しない場合の適切なエラーハンドリング

### Non-Functional Requirements (NFR)

- **NFR-01**: ルールファイルの読み込み・解析時間 < 100ms
- **NFR-02**: ドキュメント検証の実行時間 < 1秒（ルール数に依存）
- **NFR-03**: Node.js 18+ で動作
- **NFR-04**: JSON 出力は CI で parse 可能な安定構造を持つ
- **NFR-05**: ルールファイルの構文が不正な場合、明確なエラーメッセージを表示
- **NFR-06**: ルールファイルのパス解決は相対パス・絶対パスに対応

---

## Success Criteria

- ユーザーが `directoryStructure` のファイル定義に `rules` フィールドを追加できる
- ルールファイル（Markdown）を定義し、ドキュメント検証に適用できる
- `eutelo validate` コマンドでルール違反を検出できる
- CI でルール違反を自動検出し、PR の段階で阻止できる
- JSON 形式で詳細レポートが得られ、PR コメントにも転記しやすい
- 設定（fail / warn）に応じて適切に exit code が制御される

---

## Dependencies / Related

- Behavior: `../DOC-RULE-VALIDATION/BEH-DOC-RULE-VALIDATION.md`  
- Design: `../../architecture/design/DOC-RULE-VALIDATION/DSG-DOC-RULE-VALIDATION.md`  
- ADR: `../../architecture/adr/DOC-RULE-VALIDATION/ADR-DOC-RULE-VALIDATION-0001.md`  
- Parent Principle: `../../../philosophy/principles/global-principles.md`
- doc-guard（ドキュメント間整合性） / doc-lint（静的ルール）と連携

---

## Risks / Assumptions

- ルールファイルの構文設計が適切でない場合、ユーザーが使いにくい
- ルールファイルの解釈ロジックが複雑になる可能性
- プロジェクトごとに異なるルール形式を要求される可能性
- ルールファイルのバージョン管理と互換性の問題

---

## Notes

- ルールファイルの構文は Markdown ベースとし、構造化された形式で定義する
  - ルールファイルは Markdown 形式で記述され、ドキュメントの構造や内容に関する検証ルールを定義する
  - ルールファイルの具体的な構文は Design ドキュメント（DSG）で定義される
- 将来的には YAML frontmatter を含む Markdown 形式も検討可能
- ルールファイルの例やテンプレートを提供することで、ユーザーの導入を容易にする
- `directoryStructure` の `rules` フィールドは既に型定義（`DirectoryFileDefinition.rules?: string`）に存在するため、実装の基盤は整っている
- `eutelo guard` がドキュメント間の整合性を AI（LLM）で検証するのに対し、本機能は個々のドキュメント自体がユーザー定義のルールに準拠しているかを検証する
- ルールファイルは `directoryStructure` の各ファイル定義ごとに指定でき、そのファイル種別（kind）に応じた検証ルールを適用する

---

## Configuration Example

`eutelo.config.json` または `eutelo.config.js` において、`directoryStructure` のファイル定義に `rules` フィールドを追加することで、ルールファイルを指定できる：

```json
{
  "presets": ["@eutelo/preset-default"],
  "docsRoot": "new-docs",
  "directoryStructure": {
    "spec/{FEATURE}": [
      {
        "file": "PRD-{FEATURE}.md",
        "type": "prd",
        "kind": "prd",
        "template": "templates/prd.md",
        "description": "Product Requirements Document",
        "prefix": "PRD-",
        "variables": ["FEATURE"],
        "tags": ["prd", "feature"],
        "rules": "rules/prd-validation.md",
        "frontmatterDefaults": {
          "type": "prd",
          "parent": "/"
        }
      },
      {
        "file": "BEH-{FEATURE}.md",
        "type": "behavior",
        "kind": "beh",
        "template": "templates/beh.md",
        "description": "Behavior Specification",
        "prefix": "BEH-",
        "variables": ["FEATURE"],
        "tags": ["beh", "feature"],
        "rules": "rules/beh-validation.md",
        "frontmatterDefaults": {
          "type": "behavior",
          "parent": "PRD-{FEATURE}"
        }
      }
    ]
  }
}
```

ルールファイルのパスは以下のいずれかで指定可能：
- プロジェクトルートからの相対パス: `"rules/prd-validation.md"`
- 設定ファイルからの相対パス: `"./validation-rules/prd.md"`
- 絶対パス: `"/path/to/rules/prd-validation.md"`
- preset パッケージ内のルールファイル: `"@eutelo/preset-default/rules/prd.md"`（将来拡張）

---

## References

- Eutelo Document Principles  
- doc-guard PRD / DSG  
- doc-lint PRD / DSG  
- directoryStructure 設計ドキュメント

---

