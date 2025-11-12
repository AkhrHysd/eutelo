---
id: BEH-EUTELO-CORE
type: behavior
feature: Eutelo Core
title: Eutelo Core 振る舞い仕様
purpose: >
  Eutelo Coreが定義する文書構造と関係性が、どのように認識・解釈・参照されるかを観察可能な形で示す。
status: approved
version: 0.1.0
parent: PRD-EUTELO-CORE
owners: ["AkhrHysd"]
tags: ["core", "behavior"]
last_updated: "2025-11-12"
---

# BEH-EUTELO-CORE

## Background
Eutelo Coreは実行機能を持たないが、全てのドキュメントがそれを“基準”として存在する。  
そのため、このBEHでは「Core定義が存在することで何が起こるか」を観察的に示す。

---

## Scenarios

### 🧩 Scenario 1: すべての文書が同じ構造を持つ

```
Given 開発チームが新しいPRDを作成した
When そのPRDにCoreで定義されたヘッダ項目（id/type/title/purposeなど）が含まれている
Then その文書はEutelo Coreに準拠したドキュメントとして認識される
And 他のツール（Guard, Graph, Assistant）はその文書を正しく扱える
```

---

### 🧩 Scenario 2: 文書の関係性が明確である

```
Given PRD-EUTELO-COREとBEH-EUTELO-COREが存在する
When 両者にparent/featureが一致している
Then Eutelo Coreはそれらを「同一機能の関連文書」として関連づける
And 一方が削除されると「孤立文書」として警告される
```

---

### 🧩 Scenario 3: 新しい文書タイプが追加される

```
Given 開発者が新しい文書種別 "TASK" を追加したい
When Coreにその基本構造を登録する
Then 既存のツールは "TASK" を他の文書と同じ構造で扱えるようになる
And Coreの定義を変更せずに運用できる
```

---

### 🧩 Scenario 4: Core定義が更新された場合

```
Given Coreで「purpose」項目の書式が変更された
When 新旧の文書が混在している状態でプロジェクトが参照される
Then Eutelo Coreは両方を解釈可能にし、非準拠文書を明示する
And プロジェクト全体の一貫性は失われない
```

---

### 🧩 Scenario 5: 外部ツールがCoreを利用する

```
Given 外部のドキュメントツールがEuteloの構造を利用したい
When そのツールがCore定義にアクセスする
Then 同じドキュメント構造（id/type/purposeなど）を理解できる
And 生成・整合・可視化が正しく動作する
```

---

## Expected Outcomes
- すべての文書がCoreの定義で解釈される  
- 関係性（PRD↔BEH↔DSG↔ADR）が崩れない  
- Coreを更新しても既存文書が破綻しない  
- 外部モジュールがCoreを参照するだけでドキュメント全体を理解できる  

---