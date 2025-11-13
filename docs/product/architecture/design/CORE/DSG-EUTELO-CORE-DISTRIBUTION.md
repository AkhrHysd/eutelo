---
id: DSG-EUTELO-CORE-DISTRIBUTION
type: dsg
feature: EUTELO-CORE
title: Eutelo Distribution 設計ガイド
purpose: >
  Eutelo のドキュメント群および関連ガイドを npm パッケージとして配信するための設計方針を定義する。
status: draft
version: 0.7
parent: SUB-PRD-EUTELO-CORE-DISTRIBUTION
owners: ["@林田晃洋"]
last_updated: "2025-11-13"
---

## 1. 背景
Eutelo Distribution は、Eutelo プロジェクトの標準ドキュメント構造・テンプレート・更新ガイド類を  
外部プロジェクトでも再利用できるよう **配信（distribution）** するための npm パッケージである。

本ガイドは「何を配るか」「どう配るか」に限定する。

---

## 2. 目的
- 標準ドキュメント（PRD / BEH / DSG / ADR 等）のテンプレートおよび構成ガイドを統一的に配布する。  
- 異なるプロジェクト間でドキュメント規約と命名規則の一貫性を維持する。  
- 公開パッケージとして安全・透明に利用できるようにする。

---

## 3. 配信対象
| 種別 | 内容 | 配置例 |
|------|------|--------|
| **テンプレート** | PRD / BEH / DSG / ADR の雛形Markdown | `/templates/` |
| **構成ガイド** | Directory Guide・命名/配置規約 | `/config/` |
| **参考資料（例）** | CIやScaffold構成の例示（実装は他ドキュメントで管理） | `/examples/` |

---

## 4. 配信方式
- npm Public Registry に **`@eutelo/distribution`** として公開する  
- GitHub Packages にはミラーとして任意公開する  
- リリースは CI による署名付き publish（ADR-0105）

---

## 5. バージョニング方針
（略・旧版のまま、命名以外変更なし）

---

## 6. 依存・ビルド方針
（略・旧版のまま）

---

## 7. ライセンス方針
- MIT License（決定）

---

## 8. 関連
- ADR-0108（Namespace Policy）
- ADR-0105（Publishing）
- ADR-0106（Versioning）
- ADR-0101（Node）
- ADR-0102（Build）