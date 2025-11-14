---
id: TASK-DOC-SCAFFOLD-ADD
type: task
title: Document Scaffold - add 機能
purpose: >
  テンプレートが存在する全ドキュメント種別について、
  `eutelo add` により非破壊生成できるようにする。
status: draft
version: 0.1
owners: ["@AkhrHysd"]
parent: PRD-DOC-SCAFFOLD
last_updated: "2025-11-14"
---

# TASK-DOC-SCAFFOLD-ADD

## 1. Overview

対象となる `add` コマンド:

```
eutelo add prd {FEATURE}
eutelo add beh {FEATURE}
eutelo add sub-prd {FEATURE} {SUB}
eutelo add sub-beh {FEATURE} {SUB}
eutelo add dsg {FEATURE}
eutelo add adr {FEATURE}
eutelo add task {NAME}
eutelo add ops {NAME}
```

本タスクではこれらを **TDD** で実装する。

---

## 2. Red（テスト作成）

### 2.1 PRD 生成（正常）
- [ ] 正しい frontmatter が入る  
- [ ] parent が PRINCIPLE-GLOBAL  
- [ ] 既存PRDがある場合はエラー  

### 2.2 BEH 生成
- [ ] parent が PRD-{FEATURE}  
- [ ] Gherkin Feature が最低1つ入る  

### 2.3 SUB 系
- [ ] SUB-PRD  
  - parent = PRD-{FEATURE}  
- [ ] SUB-BEH  
  - parent = SUB-PRD-{SUB}  

### 2.4 DSG 生成
- [ ] 正しいパスに生成  
- [ ] id = DSG-{FEATURE}  

### 2.5 ADR 生成
- [ ] 連番採番  
- [ ] ADR-{FEATURE}-0001.md  

### 2.6 TASK / OPS 生成
- [ ] id = TASK-{NAME} / OPS-{NAME}  

### 2.7 エラーケース
- [ ] テンプレが存在しない種類  
- [ ] 無効なFEATURE名  
- [ ] 既存ファイルの上書き禁止  

---

## 3. Green（実装）

### 3.1 AddDocumentService
- [ ] 種別と引数をバリデーション  
- [ ] テンプレ読み込み  
- [ ] テンプレ変数展開  
- [ ] 出力パスの算出  
- [ ] 非破壊書き込み  

### 3.2 連番処理（ADR）
- [ ] 既存ADRをスキャンして最大値+1  
- [ ] ゼロパディング処理  

---

## 4. Refactor

- [ ] 共通ロジック（パス計算、変数展開）の抽出  
- [ ] 無効値判定の統一  

---

## 5. Definition of Done

- [ ] テンプレートが存在する全種類で `eutelo add` が成功  
- [ ] 既存ファイルは上書きしない  
- [ ] BEH の Gherkin シナリオと一致する  
- [ ] PRD/DSG の仕様に完全整合  

---