---
id: PRD-EUTELO-CONFIG-DOC-TYPES
type: prd
feature: EUTELO-CONFIG-DOC-TYPES
title: Eutelo Config Doc Types 機能 PRD
purpose: >
  ドキュメント種別（DocumentType）の定義と CLI 連携をユーザー設定で完全に拡張できるようにし、
  新種別の追加・既存種別の改名が code change なしに実現できるプラガブルな土台を提供する。
status: draft
version: 0.1.0
parent: PRD-EUTELO-CONFIGURABLE-FRAMEWORK
owners: ["@team-eutelo"]
tags: ["config", "doc-type", "extensibility"]
last_updated: "2025-11-22"
---

# PRD-EUTELO-CONFIG-DOC-TYPES

## Purpose
ドキュメント構成を設定駆動化する既存ロードマップの一環として、DocumentType（prd/beh/dsg…）のリストと CLI サブコマンドを
プロジェクトごとに自由に拡張できる状態を目指す。これにより、Eutelo を各社独自の文書体系へスムーズに適用でき、
従来の「固定 8 種類」の制約から脱却する。

---

## Background
- 現在の `packages/core/src/services/AddDocumentService.ts` では、`DocumentType` が `'prd' | 'beh' | ...` の union として
  ハードコードされており、新しい種別を登録するにはコアコードの改修が必須になっている。
- CLI も `eutelo add prd|beh|...` のように固定コマンドで構築しているため、設定ファイルが新種別を定義しても
  生成・テンプレート配布・validation に反映できない。
- Configurable Framework のゴール（どの組織でも使えるフレームワーク化）を達成するには、
  DocumentType を preset / config で自由に宣言し、コア・CLI がそれを動的に参照する必要がある。

---

## Goals / KPI
- DocumentType の一覧と属性（テンプレート・frontmatter schema 等）を config/preset に完全に委譲し、
  コアにハードコードされた union を排除する。
- CLI から新種別を追加するまでに必要な作業を「config とテンプレートの定義」のみに限定し、コード改修ゼロで
  エンドユーザーが `eutelo add <custom-type>` を利用できるようにする。
- 既存 Dento プロジェクトでは後方互換を維持しつつ、2 つ以上の新規プロジェクトでカスタム種別を導入できることを受入基準とする。

KPI（例）:
- 新種別を追加する際の「必要コード改修ファイル数」が 0。
- CLI/E2E テストでユーザー定義種別を含むプリセットを読み込ませた際に成功パスが 100% 通過。
- Config ドキュメントに DocumentType 追加手順を記載し、フィードバックで 80% 以上が理解できたと回答。

---

## Scope
### In Scope
- `DocumentType` の型・正規化ロジックを文字列ベースに再設計し、config から受け取った `scaffold` エントリのキーを
  そのまま扱えるようにする。
- CLI `add` コマンドの定義方法を見直し、config/preset に基づいてコマンドを動的に生成する、もしくは
  汎用 `eutelo add <type>` へ集約する。
- バリデーション／graph／guard が種別一覧を動的に読み取り、frontmatter schema / lint ルールを自動適用する。
### Out of Scope
- GUI での DocumentType 設定管理（今回は CLI/設定ファイル運用）。
- Guard プロンプトの自動生成など、高度な DSL 設計。
- **`eutelo sync`、`eutelo check`、`eutelo lint` コマンド**: これらのコマンドは固定種類のドキュメントタイプ（prd、beh、dsg など）を前提としており、本機能では完全にオミットする。カスタムドキュメントタイプを正常系とする設計方針に基づき、固定種類を前提としたコマンドは本機能のスコープ外とする。
  - **`eutelo sync`**: `document.prd` に強く依存し、固定のディレクトリ構造（`product/features`、`architecture/design`）を想定している。本機能では完全にオミットする。
  - **`eutelo check`**: scaffold が提供されていない場合は固定の命名規則（`DEFAULT_NAMING_RULES`）にフォールバックする。本機能では完全にオミットする。
  - **`eutelo lint`**: 設定ベースの frontmatter スキーマ検証をサポートしているが、固定種類を前提とした実装のため、本機能では完全にオミットする。

---

## Requirements
### Functional (FR)
- **FR-1:** Config/Preset 内で宣言されたすべての DocumentType を Add/Scaffold/Guard が認識し、
  必要なテンプレート・frontmatter・parent 定義を解決できること。
- **FR-2:** CLI は config を解釈して新種別の生成コマンドを提供する（または汎用コマンドで type を受け取る）。
- **FR-3:** Validation/Graph/Guard は、config に未登録の種別に対しては警告またはエラーを出し、
  登録済みの種別については既存と同じ品質のチェックを実行する。
### Non-Functional (NFR)
- バックワードコンパチブル：デフォルト preset を利用する既存ユーザーはコマンド体系の変更なしで利用可能。
- 拡張容易性：新種別追加に必要な手順を 3 ステップ以内（テンプレ記述・frontmatter schema 記述・config 追加）。

---

## Success Criteria
- `DocumentType` union が撤廃され、config に存在しない種別のみがコンパイル/実行エラーとなる状態になっている。
- CLI で `eutelo add <custom-type>` と入力し、config で定義されたテンプレートから新ドキュメントが生成できる。
- 既存 Dento プリセットで全 CLI/E2E テストが引き続き成功している。

---

## Dependencies / Related
- 親機能: `docs/product/features/EUTELO-CONFIGURABLE-FRAMEWORK/PRD-EUTELO-CONFIGURABLE-FRAMEWORK.md`
- 既存タスク: `TSK-EUTELO-CONFIG-20-PRESET-DEFAULT`, `TSK-EUTELO-CONFIG-10-RESOLVER`
- 将来連動: Validation/Graph/Guard リファクタ、CLI コマンド生成リニューアル。

---

## Risks / Assumptions
- CLI コマンド体系の変更による既存ユーザーの混乱リスク → ドキュメントと互換モードを用意する。
- 型安全性低下リスク → config 由来の種別に対して型生成（`keyof scaffold` の型推論）などでカバーする。
- テストケースの爆発を避けるため、preset fixture を使ったパラメトリックなテスト戦略が必要。

---

## Notes
- 本 PRD は DocumentType 拡張性を明示的に管理し、コアコードから Dento 固有の union を除去するための指針を提供する。
- 実装フェーズでは CLI UI/UX の再設計（サブコマンド vs 引数）を別途検討し、必要に応じて BEH/TASK を追加予定。

---

## References
- `packages/core/src/services/AddDocumentService.ts` の現行 union 定義
- `docs/product/features/EUTELO-CONFIGURABLE-FRAMEWORK/PRD-EUTELO-CONFIGURABLE-FRAMEWORK.md`
- `docs/architecture/ARCH-HARDCODING-AUDIT.md`

