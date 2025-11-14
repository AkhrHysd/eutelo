---
id: TASK-DOC-SCAFFOLD-INIT
type: task
title: Document Scaffold - init 機能
purpose: >
  `eutelo init` のコマンド実装とテスト（E2E・Unit・Integration）を
  TDD に基づいて構築する。
status: draft
version: 0.2
owners: ["@AkhrHysd"]
parent: PRD-DOC-SCAFFOLD
last_updated: "2025-11-14"
---

# TASK-DOC-SCAFFOLD-INIT  
Document Scaffold - init 機能

---

## 1. Overview

本タスクは `eutelo init` を **E2E → Unit → Integration → Green → Refactor** の  
TDD 流れで構築するための具体的タスクを定義する。

`init` の目的は：

- `eutelo-docs/` の初期生成  
- 必須ディレクトリ構造の形成  
- 既存ファイルを絶対に壊さない “非破壊生成”  
- `--dry-run` の対応

---

## 2. Red（E2E）

### 2.1 空プロジェクトでの初期化
- [ ] execa で `eutelo init` を実行  
- [ ] exit code = 0  
- [ ] `eutelo-docs/` が生成される  
- [ ] 以下のディレクトリが生成される  
  - `product/features/`  
  - `architecture/design/`  
  - `architecture/adr/`  
  - `tasks/`  
  - `ops/`  
- [ ] 既存ファイルの上書きが一切無いこと

### 2.2 既存プロジェクトでの非破壊確認
- [ ] 事前に `eutelo-docs/product/features/README.md` を置く  
- [ ] `eutelo init` 後も内容が変わらない  
- [ ] ログに「skipped」などの非破壊メッセージが含まれる

### 2.3 dry-run
- [ ] `eutelo init --dry-run` で exitCode = 0  
- [ ] 実際の filesystem が変更されない  
- [ ] 生成予定ディレクトリ一覧が表示される

---

## 3. Red（Unit / Integration）

### 3.1 core/services/ScaffoldService（Unit）
- [ ] `computeInitPlan()` が「必要な生成タスク一覧」を返す  
- [ ] 既存ディレクトリは plan に含まれない  
- [ ] dry-run フラグで書き込みを抑制

### 3.2 infrastructure/FileSystemAdapter（Integration）
- [ ] `mkdirp(path)` が階層ディレクトリを生成できる  
- [ ] `writeIfNotExists` が既存ファイルを上書きしない

---

## 4. Green（実装）

### 4.1 CLI（packages/cli）
- [ ] Commander.js で `eutelo init` コマンド定義  
- [ ] `--dry-run` オプションを CLI で受け取り core に委譲  
- [ ] exit code とログ整形を実装

### 4.2 core/services/ScaffoldService
- [ ] 必須ディレクトリ一覧を定義  
- [ ] `init()` → plan を実行  
- [ ] FileSystemAdapter を使った非破壊生成

### 4.3 infrastructure
- [ ] FileSystemAdapter の実装

---

## 5. Refactor

- [ ] 生成ディレクトリ一覧を定数ファイルへ抽出  
- [ ] エラー処理の標準化  
- [ ] ログ整形器の分離（Logger utility）

---

## 6. Definition of Done

- [ ] E2E / Unit / Integration のすべてが Green  
- [ ] `eutelo-docs/` が正しく生成される  
- [ ] 既存ファイルを絶対に壊さない  
- [ ] dry-run が期待通り動作  
- [ ] PRD / DSG / ADR と完全に整合  