---
id: PRD-DOC-GUARD-CI
type: prd
feature: doc-guard-ci
title: Document Guard CI Integration & GitHub Actions 機能 PRD
purpose: >
  eutelo-docs 内のドキュメントに変更があった際に、
  導入先プロジェクトの CI（特に GitHub Actions）上から
  `eutelo guard` を簡単かつ一貫した方法で実行できる仕組みを提供する。
  これにより、Eutelo のドキュメント整合性チェックを
  各プロジェクトの既存 CI パイプラインに最小コストで統合可能にする。
status: draft
version: 0.1
parent: PRD-DOC-GUARD
owners: ["@AkhrHysd"]
tags: ["doc-guard", "ci", "github-actions"]
last_updated: "2025-11-16"
---

# PRD-DOC-GUARD-CI
Document Guard CI Integration & GitHub Actions

---

## Purpose

本機能は、`PRD-DOC-GUARD` で定義された doc-guard（LLM による文書整合性チェック）を  
**導入先プロジェクトの CI 上で手軽に実行できるようにするための統合レイヤ** である。

特に GitHub Actions を第一級のターゲットとし、

- 1〜数行の workflow 定義の追加だけで `eutelo guard` を PR/CI に組み込める
- API endpoint / API key / モデルなど、導入先の環境に応じた設定を secrets / inputs で切り替えられる
- Monorepo / サブディレクトリ構成にも対応可能な柔軟性を持つ

ことを目的とする。

---

## Background

- doc-guard 単体では「CLI として実行できる」ことは保証されているが、
  導入先ごとの CI 設計に組み込むのは依然として手作業が必要。
- GitHub Actions では **再利用可能ワークフロー** や **Composite Action** により、
  共通のチェック処理を各リポジトリから簡単に呼び出せる。
- Eutelo の採用を促進するには、
  「ドキュメント構造の導入（doc-scaffold）」「静的ルール（doc-lint）」「内容整合性（doc-guard）」を
  CI 上でまとめて扱える導線が必要。
- ユーザーごとの Node バージョン・Monorepo 構成・`eutelo-docs/` の位置などを
  可能な限り抽象化し、入力パラメータと secrets で差し替えられる仕組みが望まれる。

---

## Goals / KPI

- GitHub Actions 上での doc-guard 導入に必要な YAML 変更行数：**最大 10 行以内**（推奨）
- 再利用ワークフロー / Action の導入にかかるセットアップ時間：**10 分未満**
- PR ごとの doc-guard 実行成功率：**99.9% 以上**
- CI 実行時間への追加オーバーヘッド：**60 秒未満**（LLM 呼び出しを含む）
- 主要なユースケース（PR 時 / main merge 時 / 手動トリガ）のテンプレート提供数：**3 パターン以上**

---

## Scope

### In Scope

- GitHub Actions 上で doc-guard を実行するための公式配布物
  - 再利用可能ワークフロー（`workflow_call` ベース）
  - Composite Action（必要に応じて）
- `eutelo guard` を呼び出す標準的な job 定義
- Monorepo / サブディレクトリ構成への対応
- API エンドポイント・API キー・モデル指定の受け渡し設計（secrets / env / inputs）
- 代表的なトリガーパターンのテンプレート提供
  - `pull_request`（eutelo-docs/ 変更時）
  - `push` to `main` / `release`
  - `workflow_dispatch`（手動実行）
- 導入ガイド（README / サンプル workflow）

### Out of Scope

- GitHub 以外の CI プラットフォーム向けの公式 Action
  - 例：GitLab CI, CircleCI, Azure Pipelines 等は「導入例ドキュメント」に留める
- doc-guard そのものの仕様変更
  - exit code / プロンプト設計 / LLM 接続方式などは `PRD-DOC-GUARD` / ADR に準拠
- eutelo-docs 以外の任意ディレクトリ向けの特殊なカスタム動作
  - 基本は `eutelo-docs/` を前提とし、パス変更は inputs で対応

---

## Requirements

### Functional Requirements (FR)

- FR-01: GitHub Actions の **再利用可能ワークフロー** として doc-guard 実行処理を提供できること
  - `uses: eutelo/eutelo-ci/.github/workflows/guard.yml@v1` のように呼び出せる
- FR-02: 再利用可能ワークフローは以下の inputs / secrets を少なくともサポートすること
  - `inputs.paths` : チェック対象のパス（デフォルト `eutelo-docs/**`）
  - `inputs.working-directory` : Monorepo 等でのサブディレクトリ指定
  - `secrets.EUTELO_GUARD_API_ENDPOINT` : LLM エンドポイント
  - `secrets.EUTELO_GUARD_API_KEY` : API キー
  - （必要に応じて）`secrets.EUTELO_GUARD_MODEL`
- FR-03: 再利用可能ワークフロー内で
  - リポジトリ checkout
  - Node 環境セットアップ
  - `@eutelo/cli` のインストール
  - `eutelo guard` 実行
  を一貫して行うこと
- FR-04: Composite Action として、
  - 既存 workflow の中から `uses: eutelo/eutelo-guard-action@v1` の形で `eutelo guard` を呼び出せるようにする
-