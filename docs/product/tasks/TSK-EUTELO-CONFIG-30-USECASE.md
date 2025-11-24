---
id: TSK-EUTELO-CONFIG-30-USECASE
type: task
feature: EUTELO-CONFIGURABLE-FRAMEWORK
title: Scaffold / Guard / Frontmatter / Graph の設定駆動リファクタ
purpose: >
  全ユースケースを設定中心の実装へ置き換え、コアが世界観を持たない状態にする。
status: red
version: 0.1.1
owners: ["@team-eutelo"]
related: [PRD-EUTELO-CONFIGURABLE-FRAMEWORK, DSG-EUTELO-CONFIGURABLE-FRAMEWORK]
due: ""
estimate:
  ideal_days: 5
  realistic_days: 7
  pessimistic_days: 12
last_updated: "2025-11-22"
---

# TSK-EUTELO-CONFIG-30-USECASE

## Target BEH Scenarios
- BEH IDs: USECASE-S1〜S8
- 観察ポイント:
  - scaffold が config.scaffold からパスを解決できる  
  - Guard が config.guard.prompts に完全依存  
  - frontmatter-check が config.frontmatter.schemas に従う  
  - Graph が schema に記述された relation を解釈する

## TDD Plan
### Red
- [x] ハードコーディング前提の UseCase を壊すテストを作成
- [x] 設定変更時に UseCase の挙動が変わらないと Red になるテストを作成

### Green
- [x] scaffold/guard/frontmatter/graph を config-driven に書き換え
- [x] 最小限のパスで BEH シナリオを Green 化

### Refactor
- [x] UseCase の責務境界を整理  
- [x] Adapter 依存を排除（CLI は別レイヤ）

## Acceptance Criteria
- [x] UseCase から世界観（Dento）の痕跡が全消滅
- [x] どの preset でも切り替え可能

## DoD
- [x] 単体テストと結合テストが安定
- [x] BEH の主要シナリオがすべて通過

## Risks / Dependencies
- リスク：graph の依存解析が壊れやすい
- 依存：TSK-EUTELO-CONFIG-20-PRESET-DEFAULT

## Notes
- 将来的な “preset-markdown-only” や “preset-enterprise” の土台になる重要工程
