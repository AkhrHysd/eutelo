---
id: TASK-DOC-SCAFFOLD-INIT
type: task
title: Document Scaffold - init 機能
purpose: >
  Eutelo 標準ドキュメント構造の初期生成機能（eutelo init）を
  テストファーストで実装する。
status: draft
version: 0.1
owners: ["@AkhrHysd"]
parent: PRD-DOC-SCAFFOLD
last_updated: "2025-11-14"
---

# TASK-DOC-SCAFFOLD-INIT

## 1. Overview

本タスクは `eutelo init` の実装を  
**TDD（Red → Green → Refactor）** で進めるためのタスク群である。

目的は、**既存プロジェクトを壊すことなく `eutelo-docs/` 以下に  
標準ドキュメント構造を生成** できること。

---

## 2. Red（テスト作成）

### 2.1 空プロジェクトでの初期生成テスト
- [ ] 空ディレクトリに対して `eutelo init` を実行  
- [ ] `eutelo-docs/` が生成される  
- [ ] `product/features/` `architecture/design/` `architecture/adr/` `tasks/` `ops/` が生成される  
- [ ] exit code = 0  

### 2.2 既存 `eutelo-docs/` がある場合の非破壊テスト
- [ ] `eutelo-docs/README.md` が既に存在する状態  
- [ ] `eutelo init` 実行後も内容が変更されていない  
- [ ] 既存ファイルは一切上書きされない  

### 2.3 エラーケース
- [ ] 書き込み権限がない場合、適切なエラーを返す  
- [ ] プロジェクトルートを誤検出した場合のエラー  

---

## 3. Green（実装）

### 3.1 ディレクトリ構造生成
- [ ] `eutelo-docs/` の存在確認と作成  
- [ ] 必須ディレクトリ群の生成  
- [ ] 標準ガイド文書（テンプレが存在する場合のみ）生成  

### 3.2 非破壊挙動の実装
- [ ] FileSystemAdapter: `writeIfNotExists`  
- [ ] 既存ファイルがある場合はスキップ  
- [ ] 上書き禁止ポリシーの適用  

### 3.3 ログ出力
- [ ] 生成内容を一覧で標準出力  
- [ ] `--dry-run` 対応  

---

## 4. Refactor

- [ ] init ロジックを ScaffoldService に移す  
- [ ] ディレクトリ一覧の定義を1か所にまとめる  
- [ ] ログ整形器を分離する  

---

## 5. Definition of Done

- [ ] すべてのテストが Green  
- [ ] 非破壊性が保証されている  
- [ ] 生成物は `eutelo-docs/` 以下に限定  
- [ ] PRD / DSG の要件と完全一致している

---