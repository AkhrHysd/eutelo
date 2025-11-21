---
id: TSK-EUTELO-CONFIG-00-AUDIT
type: task
feature: EUTELO-CONFIGURABLE-FRAMEWORK
title: ハードコーディング棚卸し
purpose: >
  現行の Eutelo 実装に埋め込まれている Dento 固有ロジックをすべて洗い出し、
  後続タスクで preset 化できるよう Red フェーズの観察材料を整える。
status: red
version: 0.1.1
owners: ["@team-eutelo"]
related: [PRD-EUTELO-CONFIGURABLE-FRAMEWORK, DSG-EUTELO-CONFIGURABLE-FRAMEWORK]
due: ""
estimate:
  ideal_days: 1
  realistic_days: 2
  pessimistic_days: 3
last_updated: "2025-11-22"
---

# TSK-EUTELO-CONFIG-00-AUDIT

## Target BEH Scenarios
- BEH IDs: CONFIG-AUDIT-S0
- 観察ポイント: スキャフォールド / Guard / 静的解析 / Graph / CI がどこに結合しているか

## TDD Plan
### Red
- [ ] コアコードからハードコーディングされた値を全列挙するテスト（スナップショット）
- [ ] 想定外の固定パス、固定 frontmatter、固定プロンプトを検出する
- 期待失敗内容: 「暗黙の規約がテストに引っかかる」

### Green
- [ ] スナップショットに現行値を記録し固定（あくまで観察用）
- [ ] 後続の Config 化の対象リストを出力

### Refactor
- [ ] 監査結果を1ファイル（ARCH-HARDCODING-AUDIT.md）に整理

## Acceptance Criteria
- [ ] すべての「固定された構造」が文書化されている
- [ ] 後続フェーズで preset 化の対象が明確

## DoD
- [ ] ARCH-HARDCODING-AUDIT.md が docs/architecture に存在
- [ ] CI でも同テストが通る

## Risks / Dependencies
- リスク：見落としにより後続フェーズで結合が残る
- 依存：なし

## Notes
- このタスクは “観察フェーズ” のため実装変更はしない