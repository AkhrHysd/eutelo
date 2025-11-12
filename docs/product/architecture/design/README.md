# 🧩 Design ドキュメントガイド

このディレクトリは、各機能の **設計仕様（DSG）** を管理します。  
目的は、PRDで定義された要件とBEHで定義された体験をもとに、  
機能の構造・データ・契約・責務を明確化することです。

---

## 構成

```
design/
  README.md
  _template-dsg.md
  {FEATURE}/
    DSG-{FEATURE}.md
    DSG-{FEATURE}-{SUB}.md
    contracts/
      {SUB}-openapi.yaml
      {SUB}-schema.json
      {SUB}-validation.md
      {SUB}-events.md
```

---

## 設計層の役割

| 層 | 内容 | 主な責務 |
|----|------|-----------|
| **上位設計（DSG-{FEATURE}.md）** | 機能全体の構造・責務・主要なデータフローを定義 | 機能の境界・主要リソース・関係性 |
| **詳細設計（DSG-{FEATURE}-{SUB}.md）** | サブ機能や内部構成を定義 | エンドポイント・スキーマ・状態遷移など |
| **contracts/** | 設計を裏付ける具体的な契約定義 | OpenAPI / Schema / Validation / Events |

---

## 作成ルール

- 各設計ドキュメントは **対応するPRDを親とする**。  
  - 例: `PRD-AUTH` → `DSG-AUTH`  
- PRD ↔ DSG は 1:多 の関係を許容する。  
- BEHで定義された観察可能な振る舞いがどの構成で支えられるかを示す。  
- ADRで採択・却下された設計判断を適宜参照する。  
- `contracts/` は設計を補強する定義群として配置し、外部共有が必要な場合のみ `architecture/contracts/` へ昇格する。  

---

## Frontmatter 共通仕様

```yaml
---
id: DSG-{FEATURE}[-{SUB}]
type: design
feature: {FEATURE}
subfeature: {SUB?}
parent: {PRD-ID}
related: [{BEH-ID}, {ADR-ID}]
purpose: >
  （この設計の目的と範囲）
status: {draft|active|deprecated}
version: {VERSION}
owners: ["@team-{FEATURE}"]
last_updated: "{DATE}"
---
```

---

## 設計ドキュメントの目的

- PRDで定義された「目的」を**どの構造で実現するか**を明確にする  
- BEHで定義された「体験」を**どの仕組みで支えるか**を説明する  
- ADRの判断を踏まえ、設計方針を**再現可能な形で共有する**  
- 設計内容はテキスト・図表・契約ファイルを組み合わせて表現してよい  

---

> **目的:**  
> 設計は「なぜこう作るのか」を明示する層であり、  
> コードの前段階としてチームの合意形成を支える。  
> このフォルダは、Eutelo設計体系の中心的レイヤーである。