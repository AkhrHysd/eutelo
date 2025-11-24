---
id: TSK-EUTELO-CONFIG-50-MIGRATION
type: task
feature: EUTELO-CONFIGURABLE-FRAMEWORK
title: Dento / Generic プロジェクトへの移行と動作検証
purpose: >
  preset-default および generic preset を使用して、
  実プロジェクト環境で Configurable Framework が破綻なく動作することを保証する。
status: red
version: 0.1.1
owners: ["@team-eutelo"]
related: [PRD-EUTELO-CONFIGURABLE-FRAMEWORK, DSG-EUTELO-CONFIGURABLE-FRAMEWORK]
due: ""
estimate:
  ideal_days: 3
  realistic_days: 5
  pessimistic_days: 8
last_updated: "2025-11-22"
---

# TSK-EUTELO-CONFIG-50-MIGRATION

## Target BEH Scenarios
- BEH IDs: MIG-S1〜S4
- 観察ポイント:  
  - preset-default で Dento が現行通り動く  
  - generic preset で別プロジェクトが壊れず稼働  

## TDD Plan
### Red
- [ ] 旧 Eutelo の PRD/BEH/DSG/ADR を読み込むテストを壊す
- [x] config 変更時に挙動が変わらないことを検証する Red 書く

### Green
- [ ] Dento で全ドキュメントが生成・チェックできる
- [ ] 外部ミニプロジェクトで scaffold/guard が動作

### Refactor
- [ ] config/generic-preset の構造調整
- [ ] README / GUIDE の整理

## Acceptance Criteria
- [ ] 2つ以上のプロジェクトで成功確認
- [ ] preset-default に依存しないプロジェクトが成立

## DoD
- [ ] 全主要 BEH シナリオが CI 上で pass
- [ ] Eutelo ドキュメント（Directory Guide / PRD / DSG）が更新済み

## Risks / Dependencies
- 依存：すべての前フェーズ
- リスク：現行 Dento 仕様との微妙な差異

## Notes
- ここで初めて “framework としての完成” を宣言できる
