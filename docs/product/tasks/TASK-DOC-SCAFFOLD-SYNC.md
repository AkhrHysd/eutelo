---
id: TASK-DOC-SCAFFOLD-SYNC
type: task
title: Document Scaffold - sync 機能
purpose: >
  Eutelo 標準文書の不足を検出し、自動生成する sync 機能を
  テストファーストで実装する。
status: draft
version: 0.1
owners: ["@AkhrHysd"]
parent: PRD-DOC-SCAFFOLD
last_updated: "2025-11-14"
---

# TASK-DOC-SCAFFOLD-SYNC

## 1. Overview

本タスクは `eutelo sync` の  
**不足テンプレート検出 / 非破壊生成 / CI対応** を TDD で実装する。

---

## 2. Red（テスト作成）

### 2.1 不足テンプレの検出（正常）
- [ ] サンプルプロジェクトから PRD だけ削除  
- [ ] `eutelo sync` 実行で PRD が生成される  
- [ ] 既存の BEH / DSG が変更されない  

### 2.2 すべて揃っている場合の no-op
- [ ] 全テンプレが揃った状態で `eutelo sync`  
- [ ] 「no changes」  
- [ ] exit code = 0  
- [ ] ファイルが1つも変更されない  

### 2.3 `--check-only`
- [ ] ファイル作成が行われない  
- [ ] exit code = 1（不足あり）  

---

## 3. Green（実装）

### 3.1 構造解析
- [ ] 期待構造の計算（features/{FEATURE}/PRD-{FEATURE}.md …）  
- [ ] 実在ファイルのスキャン  
- [ ] 差分をリストアップ  

### 3.2 非破壊生成
- [ ] TemplateService でテンプレ展開  
- [ ] writeIfNotExists でのみ生成  

### 3.3 CI向け
- [ ] `--check-only` 実装  
- [ ] exit code の規約を実装  
- [ ] CI向けログ形式  

---

## 4. Refactor

- [ ] 構造定義を JSON 化（後続で利用）  
- [ ] sync ロジックをサービスに集約  
- [ ] テストの fixture 整備  

---

## 5. Definition of Done

- [ ] sync が不足テンプレのみ生成  
- [ ] 上書きは一切発生しない  
- [ ] CI 検証と連動  
- [ ] BEH/DSG の仕様と一致している

---