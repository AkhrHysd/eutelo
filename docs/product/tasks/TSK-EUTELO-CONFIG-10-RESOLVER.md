---
id: TSK-EUTELO-CONFIG-10-RESOLVER
type: task
feature: EUTELO-CONFIGURABLE-FRAMEWORK
title: Config モデル定義と Resolver 基盤構築
purpose: >
  EuteloConfig / EuteloPreset の型定義と config resolver を実装し、
  スキャフォールド・Guard・静的解析が設定依存に置き換わる基盤を完成させる。
status: red
version: 0.1.1
owners: ["@team-eutelo"]
related: [PRD-EUTELO-CONFIGURABLE-FRAMEWORK, DSG-EUTELO-CONFIGURABLE-FRAMEWORK]
due: ""
estimate:
  ideal_days: 3
  realistic_days: 5
  pessimistic_days: 7
last_updated: "2025-11-22"
---

# TSK-EUTELO-CONFIG-10-RESOLVER

## Target BEH Scenarios
- BEH IDs: CONFIG-RESOLVER-S1 / S2 / S3
- 観察ポイント: 設定の読み込み・preset のマージ・型検証がコアで完結

## TDD Plan
### Red
- [ ] YAML/JSON/TS の各 config をロードし失敗するテストを書く
- [ ] preset のマージ順（default → preset → project）が崩れて Red になるテストを書く

### Green
- [ ] Resolver 実装（loadConfig / merge / validation）
- [ ] 読み込み順・上書き優先がテストで保証される

### Refactor
- [ ] Config ロジックを専用モジュールに分離
- [ ] 冗長な型/ロジックの削減

## Acceptance Criteria
- [ ] `loadConfig()` で最終設定が一意に決まる
- [ ] バリデーションエラーが明確なエラーとして返る
- [ ] CLI / UseCase から resolver が利用可能

## DoD
- [ ] `@eutelo/core/config/` 以下が安定
- [ ] Resolver の単体テストカバレッジ 80% 以上

## Risks / Dependencies
- リスク：マージ戦略の仕様ブレが後続に波及
- 依存：TASK-EUTELO-CONFIG-00-AUDIT

## Notes
- このタスク完了後、いったん core が「設定駆動」になる