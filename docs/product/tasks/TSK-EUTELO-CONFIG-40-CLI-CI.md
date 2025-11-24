---
id: TSK-EUTELO-CONFIG-40-CLI-CI
type: task
feature: EUTELO-CONFIGURABLE-FRAMEWORK
title: CLI / CI の設定駆動化とアダプタ化
purpose: >
  CLI と GitHub Actions を UseCase のアダプタとして再構築し、
  設定変更や preset 差し替え時にも壊れない実行レイヤーを提供する。
status: red
version: 0.1.1
owners: ["@team-eutelo"]
related: [PRD-EUTELO-CONFIGURABLE-FRAMEWORK, DSG-EUTELO-CONFIGURABLE-FRAMEWORK]
due: ""
estimate:
  ideal_days: 2
  realistic_days: 4
  pessimistic_days: 6
last_updated: "2025-11-22"
---

# TSK-EUTELO-CONFIG-40-CLI-CI

## Target BEH Scenarios
- BEH IDs: CLI-CI-S1〜S3
- 観察ポイント:
  - CLI から config → UseCase が一貫して呼ばれる  
  - CI Action が preset の差し替えで壊れない

## TDD Plan
### Red
- [x] CLI が旧仕様のハードロジックに依存するテストを書く
- [x] CI Action が preset なしで壊れる Red テストを書く

### Green
- [x] CLI を UseCase アダプタにリファクタ
- [x] CI Action を `eutelo guard` に集約

### Refactor
- [x] コマンドの help / debug ログ改善
- [x] CI の差分検出ロジックを最適化

## Acceptance Criteria
- [x] CLI が設定・preset 切替に完全対応
- [x] GitHub Actions 用アクションが単純化

## DoD
- [x] docs/ops に CLI / CI の Runbook 更新済み

## Risks / Dependencies
- 依存：TSK-EUTELO-CONFIG-30-USECASE
- リスク：プロジェクトによるローカル CI スクリプトが古い仕様に依存している可能性

## Notes
- CI は Adapter の位置づけなので余計なロジックは入れない
