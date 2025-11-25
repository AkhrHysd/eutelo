---
id: PRD-AAA
type: prd
feature: AAA
title: AAA 機能 PRD
purpose: |
  AAA 機能の目的・KPI・スコープ・成功基準を定義し、 上位原則（Principle）および関連ドキュメントとの整合を保つ。
status: draft
parent: /
tags:
  - AAA
last_updated: 2025-11-25
---

# PRD-AAA

## Purpose
この機能の存在目的、および上位原則との関係を記述する。  
どの価値（Core Values）を体現し、どの目的（Vision / Principles）を具現化するのかを明確にする。

---

## Background
（課題 / 背景 / 関連する他機能・仕様）  
例：既存のドキュメント整合処理が静的であり、動的検証が必要。

---

## Goals / KPI
この機能で達成すべき目標を定義する。  
例：
- Purpose整合率 > 99%
- LLM整合検証の平均実行時間 < 2.0s
- CI連携率 100%

---

## Scope
### In Scope
- 対象とする処理・責務・利用範囲。
### Out of Scope
- 本機能では扱わない範囲や前提条件。

---

## Requirements
### Functional (FR)
- 機能として提供すべき要件。
  - 例：Frontmatter構文解析、Purposeツリー生成、CI連携API。
### Non-Functional (NFR)
- パフォーマンス、セキュリティ、拡張性、可用性、アクセシビリティなど。

---

## Success Criteria
この機能が完了・成功とみなされる条件。  
例：
- Core Principles に反しない構造であること。
- 自動検証・人レビューの両方を通過すること。
- 他機能（CLI / Graph / Guard）から利用可能であること。

---

## Dependencies / Related
- Behavior: `../AAA/BEH-AAA.md`  
- Design: `../../architecture/design/AAA/DSG-AAA.md`  
- ADR: `../../architecture/adr/AAA/ADR-AAA-0001.md`  
- Parent Principle: `../../../philosophy/principles/global-principles.md`

---

## Risks / Assumptions
- 想定外の仕様変更やLLM API制限などのリスクを記述。  
- 仮定条件が存在する場合は明示。

---

## Notes
補足事項、議論の余地のある設計判断、未確定要素など。  
必要に応じてADRに分離する。

---

## References
関連資料・議事録・外部仕様・既存実装などを列挙する。

---

