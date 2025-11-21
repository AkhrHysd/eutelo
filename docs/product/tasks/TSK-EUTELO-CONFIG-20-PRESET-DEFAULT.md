---
id: TSK-EUTELO-CONFIG-20-PRESET-DEFAULT
type: task
feature: EUTELO-CONFIGURABLE-FRAMEWORK
title: preset-default パッケージ作成と現行仕様の移管
purpose: >
  既存の Dento/Eutelo 固有仕様を @eutelo/preset-default に退避し、
  コアから完全に切り離す。
status: red
version: 0.1.1
owners: ["@team-eutelo"]
related: [PRD-EUTELO-CONFIGURABLE-FRAMEWORK, DSG-EUTELO-CONFIGURABLE-FRAMEWORK]
due: ""
estimate:
  ideal_days: 4
  realistic_days: 6
  pessimistic_days: 9
last_updated: "2025-11-22"
---

# TSK-EUTELO-CONFIG-20-PRESET-DEFAULT

## Target BEH Scenarios
- BEH IDs: PRESET-DEFAULT-S1〜S5
- 観察ポイント: 全機能がコアではなく preset-default に依存する状態

## TDD Plan
### Red
- [ ] preset-default 未導入状態で全機能が壊れるテストを書く
- [ ] コア内部に残ったハードコーディングが検出されるテストを書く

### Green
- [ ] preset-default パッケージを実装
- [ ] 全テンプレート、全 frontmatter schema、全 LLM プロンプトを移行
- [ ] コアを設定依存に全面変更

### Refactor
- [ ] preset-default の構造整理（templates/prompts/schemas 配下）
- [ ] コア側からデッドコード除去

## Acceptance Criteria
- [ ] コア側には「世界観」を示す値が一切残っていない
- [ ] preset-default を外すとエラーになるが、preset-default を入れれば動く

## DoD
- [ ] `packages/preset-default/` が存在し npm publish 可能
- [ ] CI 上でも preset による動作が安定

## Risks / Dependencies
- リスク：移行漏れによって異常挙動
- 依存：TSK-EUTELO-CONFIG-10-RESOLVER

## Notes
- ここが「分離成功の成否」が決まる最重要フェーズ