---
id: PRD-EUTELO-FEATURE-SIMPLIFICATION
type: prd
feature: EUTELO-FEATURE-SIMPLIFICATION
title: Eutelo 機能簡素化 PRD
purpose: >
  Euteloの本来のコンセプトに合致しない、過剰にマッチしたコマンドオプションや
  複雑化している機能を排除し、コアバリューに集中したシンプルなエコシステムを実現する。
status: draft
version: 0.1
parent: PRD-EUTELO-CORE
owners: ["@AkhrHysd"]
tags: ["simplification", "core-values", "refactoring"]
last_updated: "2025-01-27"
---

# PRD-EUTELO-FEATURE-SIMPLIFICATION

## Background

Euteloの本来のコンセプトは以下の通りである：

1. **ドキュメントをユーザー指定のルールでテンプレートに応じた規則正しい配置で作成できる**
2. **作成したドキュメント間の整合性とドキュメント自体、内部の記述に矛盾がないかをLLMが判断できる仕組みを提供**
3. **利用者が組み合わせて更新するたびにチェックを行えるエコシステムとして利用できる**

しかし、現在の実装には以下のような問題がある：

- 本来のコンセプトに合致しない独立した分析・可視化ツールが提供されている
- 開発者向けのデバッグツールがエンドユーザー向けコマンドとして公開されている
- 過剰なオプションにより複雑化し、本来の目的から外れた機能が混在している
- 組み込みドキュメント種別が存在し、カスタム設定の価値を損なっている

これらは、Euteloのコアバリューである「目的駆動・構造化ドキュメントのエコシステム」から逸脱し、単なる「ドキュメント管理ツール」になってしまうリスクがある。

---

## Goals / 成し遂げたいこと

1. **コアバリューに集中したシンプルな機能セットを実現する**
   - ドキュメント作成（`eutelo add`）
   - 整合性チェック（`eutelo guard`, `eutelo validate`）
   - 初期化（`eutelo init`）
   に焦点を当てる

2. **本来のコンセプトから外れた機能を排除する**
   - 独立した分析・可視化ツールの削除
   - 開発者向けデバッグツールの非公開化
   - 過剰なオプションの簡素化

3. **内部実装として必要な機能は保持する**
   - `eutelo guard`が使用するグラフ機能は内部実装として保持
   - 関連ドキュメント解決機能は内部実装として保持

4. **カスタマイズ性を損なわない**
   - ユーザー指定のルール・テンプレート・配置は維持
   - 設定ファイルによる柔軟な拡張性は維持

---

## Non-Goals / やらないこと（境界）

- コア機能（`init`, `add`, `guard`, `validate`）の削除
- 設定ファイルの機能削減
- 内部実装として必要なグラフ機能の完全削除
- 後方互換性を完全に維持すること（破壊的変更を許容）

---

## What / この機能が提供するもの

### 排除する機能・オプション

#### 1. `eutelo graph` コマンド全体の削除

**理由:**
- 独立した分析・可視化ツールとして提供されているが、本来のコンセプト（整合性チェック）とは異なる目的
- `eutelo guard`が内部的にグラフ機能を使用して関連ドキュメントを収集しているため、独立したコマンドとして公開する必要はない
- 可視化や統計情報の提供は、本来の「整合性チェックエコシステム」の目的から外れている

**対象:**
- `eutelo graph build` - グラフの構築・出力（JSON/Mermaid形式）
- `eutelo graph show <documentId>` - 個別ドキュメントの関係表示
- `eutelo graph impact <documentId>` - 影響範囲分析
- `eutelo graph summary` - 統計情報表示
- `eutelo graph related <documentPath>` - 関連ドキュメント一覧（`eutelo guard`の内部機能と重複）

**保持する内部実装:**
- `RelatedDocumentResolver` - `eutelo guard`が使用する関連ドキュメント解決機能
- `GraphBuilder` - グラフ構築機能（内部実装として保持）
- `DocumentScanner` - ドキュメントスキャン機能（内部実装として保持）

#### 2. `eutelo config inspect` コマンドの削除

**理由:**
- 開発者向けデバッグツールであり、エンドユーザーには不要
- 設定ファイルの確認は、設定ファイル自体を直接確認することで十分
- 本来のコンセプト（ドキュメント作成・整合性チェック）から外れている

#### 3. `eutelo init --placeholder-format` オプションの削除

**理由:**
- 未実装の機能であり、複雑化の原因となっている
- 現在は固定形式（`__VARIABLE__`）を使用しており、カスタマイズの必要性が低い
- 将来の拡張性よりも、現在のシンプルさを優先

#### 4. `eutelo guard --japanese` / `--ja` オプションの削除

**理由:**
- 出力言語の指定は、本来の「整合性チェック」の目的から外れている
- LLMの応答言語は、プロンプトテンプレートやモデル設定で制御すべき
- コマンドラインオプションとして提供する必要性が低い

#### 5. `eutelo graph build --format mermaid` の削除

**理由:**
- `eutelo graph`コマンド全体を削除するため、このオプションも不要
- 可視化は本来の目的から外れている

#### 6. `eutelo add` の組み込みドキュメント種別の非推奨化

**理由:**
- カスタム設定で十分対応可能であり、組み込み種別は不要
- ユーザー指定のルール・テンプレートに集中すべき
- ただし、後方互換性のため完全削除はせず、非推奨として扱う

**対象:**
- `eutelo add prd <feature>`
- `eutelo add beh <feature>`
- `eutelo add sub-prd <feature> <sub>`
- `eutelo add sub-beh <feature> <sub>`
- `eutelo add dsg <feature>`
- `eutelo add adr <feature>`
- `eutelo add task <name>`
- `eutelo add ops <name>`

**対応:**
- これらのコマンドは非推奨として扱い、設定ファイルで定義されたカスタム種別を推奨
- 完全削除は行わず、警告メッセージを表示

---

## Why / この機能が必要な理由

1. **コアバリューへの集中**
   - Euteloの本来のコンセプトである「整合性チェックエコシステム」に集中する
   - 不要な機能により、本来の目的が曖昧になることを防ぐ

2. **複雑性の削減**
   - 過剰なオプションや機能により、ユーザーが迷子になることを防ぐ
   - シンプルな機能セットにより、学習コストを下げる

3. **保守性の向上**
   - 不要な機能を削除することで、コードベースの保守性を向上させる
   - テスト対象の削減により、品質向上に集中できる

4. **明確な価値提供**
   - 独立した分析ツールではなく、整合性チェックに特化したエコシステムとして明確に位置づける

---

## Example Scenarios / ユースケース

### 1. ドキュメント作成者
- `eutelo add` でカスタム設定に基づいてドキュメントを作成
- 組み込み種別に依存せず、設定ファイルで定義された種別を使用

### 2. 整合性チェック実行者
- `eutelo guard` でドキュメント間の整合性をチェック
- グラフ機能は内部実装として動作し、ユーザーは意識しない

### 3. プロジェクト初期化者
- `eutelo init` でシンプルにディレクトリ構造を初期化
- 過剰なオプションに迷うことなく、基本的な初期化を実行

---

## Success Indicators / 成功の判断軸

- **コマンド数が削減され、主要機能（`init`, `add`, `guard`, `validate`）に集中している**
- **ユーザーが迷子になることなく、本来の目的（整合性チェック）を達成できる**
- **コードベースの複雑性が削減され、保守性が向上している**
- **設定ファイルによるカスタマイズ性が維持されている**

---

## Scope

### In Scope（この機能が扱うもの）

- `eutelo graph` コマンド全体の削除
- `eutelo config inspect` コマンドの削除
- 過剰なオプションの削除（`--placeholder-format`, `--japanese`）
- 組み込みドキュメント種別の非推奨化
- 内部実装として必要なグラフ機能の保持

### Out of Scope（扱わないもの）

- コア機能（`init`, `add`, `guard`, `validate`）の変更
- 設定ファイルの機能削減
- 後方互換性の完全維持（破壊的変更を許容）

---

## Requirements

### Functional

- **FR1: `eutelo graph` コマンドの削除**
  - すべてのサブコマンド（`build`, `show`, `impact`, `summary`, `related`）を削除
  - 内部実装として必要なグラフ機能は保持

- **FR2: `eutelo config inspect` コマンドの削除**
  - 開発者向けデバッグツールとして非公開化

- **FR3: 過剰なオプションの削除**
  - `eutelo init --placeholder-format` の削除
  - `eutelo guard --japanese` / `--ja` の削除

- **FR4: 組み込みドキュメント種別の非推奨化**
  - 非推奨警告メッセージの表示
  - 設定ファイルによるカスタム種別の推奨

### Non-Functional

- **後方互換性**: 組み込み種別は非推奨とするが、動作は維持
- **内部実装の保持**: `eutelo guard`が使用するグラフ機能は内部実装として保持
- **設定ファイルの維持**: カスタマイズ性は維持

---

## Risks

- **後方互換性の破壊**: 既存ユーザーが`eutelo graph`コマンドを使用している場合、影響が発生する
- **機能不足の懸念**: グラフ機能を削除することで、一部ユーザーの要望に応えられなくなる可能性
- **移行コスト**: 既存のワークフローやCI/CDパイプラインで`eutelo graph`を使用している場合、移行が必要

---

## Migration Guide

### `eutelo graph` コマンドの代替

- **`eutelo graph build`**: 削除。グラフの可視化が必要な場合は、外部ツールを使用
- **`eutelo graph show`**: 削除。ドキュメントの関係性は`eutelo guard`の出力で確認
- **`eutelo graph impact`**: 削除。影響範囲は`eutelo guard`の関連ドキュメント収集機能で確認
- **`eutelo graph summary`**: 削除。統計情報が必要な場合は、設定ファイルやドキュメント構造から確認
- **`eutelo graph related`**: 削除。`eutelo guard`の関連ドキュメント収集機能で代替

### `eutelo config inspect` の代替

- 設定ファイル（`eutelo.config.*`）を直接確認

### 組み込みドキュメント種別の移行

- 設定ファイルでカスタム種別を定義
- 例: `eutelo.config.ts`で`scaffold`を定義し、`eutelo add <kind>`を使用

---

## Implementation Notes

- 内部実装として必要なグラフ機能は、`packages/core/src/graph/`配下に保持
- `RelatedDocumentResolver`は`eutelo guard`が使用するため、削除しない
- 非推奨警告は、`eutelo add`の組み込み種別使用時に表示

---

## References

- [PRD-EUTELO-CORE](./CORE/PRD-EUTELO-CORE.md) - Eutelo Core機能PRD
- [PRD-DOC-GRAPH](./DOC-GRAPH/PRD-DOC-GRAPH.md) - グラフ機能PRD（削除対象）
- [Vision and Core Values](../../philosophy/vision-and-core-values.md) - Euteloのビジョンとコアバリュー

