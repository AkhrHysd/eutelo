---
id: PRD-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE
type: prd
feature: EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE
title: Eutelo Init ディレクトリ構造カスタマイズ機能 PRD
purpose: >
  `eutelo init` コマンドで作成されるディレクトリ構造を設定ファイルでカスタマイズできるようにし、
  プロジェクトごとの異なるドキュメント文化や組織構造に柔軟に対応できるようにする。
status: draft
version: 0.1
parent: PRD-EUTELO-CONFIGURABLE-FRAMEWORK
owners: ["@AkhrHysd"]
tags: ["eutelo", "config", "init", "directory", "scaffold"]
last_updated: "2025-12-03"
---

# PRD-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE

## Purpose
本機能は、`eutelo init` コマンドで作成されるディレクトリ構造を設定ファイルで定義・カスタマイズできるようにすることで、
Eutelo を様々なプロジェクト構造や組織文化に適用可能にする。

現状では `RELATIVE_STRUCTURE` が固定値としてハードコーディングされており、
`product/features`、`architecture/design` などの標準構造以外のディレクトリ構成を必要とするプロジェクトでは
コード改修なしには対応できない。本機能により、設定ファイルの変更のみでディレクトリ構造をカスタマイズできるようにする。

---

## Background

### 現状の問題
1. **固定ディレクトリ構造**
   - `RELATIVE_STRUCTURE` が `packages/core/src/constants/requiredDirectories.ts` に固定値として定義されている
   - `eutelo init` は常に以下の構造を作成する：
     ```
     eutelo-docs/
       product/
         features/
       architecture/
         design/
         adr/
       tasks/
       ops/
     ```
2. **カスタマイズの困難さ**
   - プロジェクトによっては異なるディレクトリ構造が必要（例：`docs/requirements/`、`docs/design/`、`docs/decisions/`）
   - 現在は `docsRoot` のみ変更可能で、内部構造は固定
   - カスタマイズにはコード改修が必要

### 関連する既存機能
- `PRD-EUTELO-CONFIGURABLE-FRAMEWORK`: 設定ファイルによるカスタマイズ機能の基盤
- `PRD-DOC-SCAFFOLD`: スキャフォールド機能の要件定義
- 既に `scaffold` 設定でドキュメント生成時のパスはカスタマイズ可能だが、`init` で作成するディレクトリ構造は未対応

---

## Goals / KPI

### Goals
- `eutelo init` で作成されるディレクトリ構造を設定ファイルで定義できるようにする
- 既存プロジェクトに対しては非互換な変更を加えない（デフォルト設定で現状と同じ挙動）
- 設定ファイルの変更のみでディレクトリ構造をカスタマイズできるようにする
- 設定の検証とエラーハンドリングを適切に行う

### KPI（暫定）
- 設定ファイルでディレクトリ構造をカスタマイズできるプロジェクトの割合：**100%**
- 既存プロジェクト（設定ファイルなし）でも現状と同じ挙動を維持：**100%**
- 設定ファイルの誤りを検出し、明確なエラーメッセージを表示：**100%**
- `eutelo init` の実行時間への影響：**< 10% の増加**

---

## Scope

### In Scope
- 設定ファイルでディレクトリ構造を定義できるようにする
- ディレクトリ構造とその配下で使用されるドキュメントテンプレートの関連性を定義できるようにする
- 設定ファイルの検証機能（形式チェック、パスの妥当性チェック）
- デフォルト設定の提供（既存の標準構造をデフォルトとして維持）
- 設定ファイル未指定時の後方互換性の確保

### Out of Scope（今回やらないもの）
- ディレクトリ構造の動的生成（実行時に決定する機能）
- ディレクトリ構造のバージョン管理・マイグレーション機能
- GUI による設定編集機能
- 設定ファイルの自動生成機能（別 PRD で扱う可能性あり）

---

## Requirements

### 4.1 Functional Requirements (FR)

#### FR-1: 設定ファイルによるディレクトリ構造の定義

- `eutelo.config.*` でディレクトリ構造を定義できること
- ディレクトリ構造と、その配下で使用されるドキュメントテンプレートの関連性をまとめて定義できること
- 設定形式は構造化された形式を採用し、ディレクトリごとに以下の情報を含められること：
  - ディレクトリパス（相対パス）
  - そのディレクトリ配下で使用されるドキュメントテンプレートの種類（オプション）
  - ディレクトリの説明や目的（オプション）

**設定形式の例（構造体形式）:**

```yaml
# eutelo.config.yaml
docsRoot: docs
directoryStructure:
  - path: []
    description: "ドキュメントルート"
  - path: [requirements]
    templates: [prd, beh]
  - path: [requirements, features]
    templates: [prd, beh, sub-prd, sub-beh]
  - path: [design]
    templates: [dsg]
  - path: [design, architecture]
    templates: [dsg]
  - path: [decisions]
    templates: [adr]
  - path: [tasks]
    templates: [task]
  - path: [operations]
    templates: [ops]
```

または、よりシンプルな配列形式もサポート：

```yaml
# 後方互換性のためのシンプル形式
docsRoot: docs
directoryStructure:
  - []
  - [requirements]
  - [requirements, features]
  - [design]
  - [decisions]
  - [tasks]
  - [operations]
```

- 空配列 `[]` または `path: []` は `docsRoot` 自体を表す
- `['product', 'features']` または `path: ['product', 'features']` は `{docsRoot}/product/features` を表す
- 具体的な設定形式の詳細は DSG で設計する

#### FR-2: デフォルト設定の提供

- 設定ファイルで `directoryStructure` が未指定の場合、既存の標準構造をデフォルトとして使用すること
- デフォルト構造は現状の Eutelo 標準構造（`product/features`、`architecture/design`、`architecture/adr`、`tasks`、`ops` など）を維持すること
- これにより既存プロジェクトへの非互換な変更を避ける

#### FR-3: 設定の検証

- `directoryStructure` の形式を検証すること
  - 有効な形式であること（構造体形式または配列形式）
  - 各ディレクトリパスが有効であること（相対パスのみ許可、絶対パスや `..` を含むパスは拒否）
  - 空でないこと（最低限ルートディレクトリは含まれること）
- 無効な設定の場合は明確なエラーメッセージを表示すること
- テンプレート参照の妥当性チェック（存在するテンプレートのみ参照可能）

#### FR-4: 既存機能との統合

- `eutelo init` コマンドが設定ファイルからディレクトリ構造を読み込み、それに基づいてディレクトリを作成すること
- 設定ファイルが指定されていない場合はデフォルト構造を使用すること
- ディレクトリ構造の定義と、`scaffold` 設定で定義されたテンプレートパスとの整合性を保つこと

#### FR-5: 後方互換性の確保

- 設定ファイルが存在しない、または `directoryStructure` が未指定の場合は、現状と同じ挙動を維持すること
- 既存の標準構造はデフォルト値として保持すること

---

### 4.2 Non-Functional Requirements (NFR)

- **NFR-1: パフォーマンス**
  - 設定ファイルの読み込み・検証により、`eutelo init` の実行時間が顕著に悪化しないこと
  - 設定は `loadConfig` のキャッシュ機構を利用し、同一プロセス内で再パースを避けること

- **NFR-2: エラーハンドリング**
  - 設定ファイルに誤りがある場合、明確なエラーメッセージで通知すること
  - どの設定ファイルのどの行で問題が発生したかを示すこと
  - 設定の検証エラーは `ConfigError` として処理すること

- **NFR-3: ドキュメント**
  - 本機能について、README や設定ファイルの例で説明されていること
  - ディレクトリ構造のカスタマイズ例を複数提供すること

- **NFR-4: 型安全性**
  - TypeScript の型定義を提供し、IDE 補完や型チェックが効くようにすること
  - 設定ファイルの型定義を公開し、IDE での補完を可能にすること

---

## 5. Design Considerations

### 5.1 設定の形式

- **構造化された形式を採用**
  - ディレクトリとその配下で使用されるテンプレートの関連性を明確に表現
  - 将来的な拡張（メタデータ、説明など）に対応しやすい
  - 後方互換性のため、シンプルな配列形式もサポート

### 5.2 デフォルト値の扱い

- 既存の標準構造をデフォルト値として保持
- 設定ファイル未指定時はデフォルト構造を使用
- 既存プロジェクトへの影響を最小化

### 5.3 検証とエラーハンドリング

- 設定ファイル読み込み時に検証を実施
- 無効な設定の場合は明確なエラーメッセージを表示
- エラー処理は既存のエラーハンドリング機構を利用

---

## 6. Risks & Trade-offs

- **設定の複雑化**
  - ディレクトリ構造を自由に定義できることで、プロジェクト間で構造が大きく異なり、Eutelo の「標準構造」としての価値が薄れる可能性
  - → デフォルト設定を「推奨スタイル」として強く位置づけ、カスタマイズは「異なる作法を持つ組織向けの escape hatch」とする

- **後方互換性の維持**
  - 既存プロジェクトへの影響を最小化する必要がある
  - → デフォルト設定で現状と同じ挙動を維持することで対応

- **設定の検証コスト**
  - 複雑な検証ロジックにより、設定読み込みが遅くなる可能性
  - → 基本的な検証のみ行い、詳細な検証は必要に応じて後続で追加

---

## 7. Open Questions

- **設定ファイルの形式について**
  - 構造体形式（ディレクトリとテンプレートをまとめて定義）と配列形式（シンプルなパスのみ）のどちらを採用するか？
  - 両方をサポートするか、どちらか一方に統一するか？
  - → DSG または ADR で検討が必要

- **ディレクトリとテンプレートの関連性**
  - ディレクトリ構造の定義に、その配下で使用されるテンプレート情報を含めるべきか？
  - テンプレート情報を含める場合、`scaffold` 設定との重複をどう扱うか？
  - → DSG で設計方針を決定

- **メタデータの扱い**
  - ディレクトリ構造の定義にメタデータ（説明、必須/任意など）を含めるか？
  - 将来的に拡張の可能性は残す

- **設定ファイル間での継承・マージ**
  - 設定ファイル間でのディレクトリ構造の継承・マージは必要か？
  - preset との統合は後続で検討

---

## 8. Success Criteria

- 設定ファイルでディレクトリ構造をカスタマイズできること
- 既存プロジェクト（設定ファイルなし）でも現状と同じ挙動を維持すること
- 設定ファイルの誤りを適切に検出し、明確なエラーメッセージを表示すること
- `eutelo init` の実行時間への影響が最小限であること

---

## 9. Dependencies / Related

- Behavior: `../EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE/BEH-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE.md`（未作成）
- Design: `../../architecture/design/EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE/DSG-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE.md`（未作成）
- Parent: `PRD-EUTELO-CONFIGURABLE-FRAMEWORK`
- Related: `PRD-DOC-SCAFFOLD`

---

## 10. Next Steps

1. **ADR の作成（推奨）**
   - 設定ファイルの形式（構造体形式 vs 配列形式）の決定
   - ディレクトリとテンプレートの関連性の定義方法の決定
   - 後方互換性の確保方法の決定

2. **DSG の作成**
   - `DSG-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE` を追加
   - 設定スキーマ（型定義）の設計
   - 設定ファイルの読み込み・検証ロジックの設計
   - 既存機能（ScaffoldService など）との統合方法の設計

3. **実装タスク**
   - 設定スキーマの実装
   - 設定ファイルの読み込み・検証ロジックの実装
   - `eutelo init` コマンドの修正
   - テストの追加

4. **ドキュメント**
   - README への機能説明の追加
   - 設定ファイルの例の追加
   - マイグレーションガイドの作成（既存プロジェクト向け）

---

## 11. References

- `PRD-EUTELO-CONFIGURABLE-FRAMEWORK`: 設定ファイルによるカスタマイズ機能の基盤
- `PRD-DOC-SCAFFOLD`: スキャフォールド機能の要件定義
- `DSG-EUTELO-CONFIGURABLE-FRAMEWORK`: 設定ファイルの設計方針
- 既存実装（参考）:
  - `packages/core/src/constants/requiredDirectories.ts`
  - `packages/core/src/services/ScaffoldService.ts`
  - `packages/core/src/config/types.ts`

