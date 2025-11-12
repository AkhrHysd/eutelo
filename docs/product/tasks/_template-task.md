---
id: TSK-{FEATURE}
type: task
feature: {FEATURE}
title: {FEATURE} タスク計画
purpose: >
  {FEATURE} の BEH シナリオを TDD（Red→Green→Refactor）で満たす。
status: red
version: 0.1.1
owners: ["@team-{FEATURE}"]
related: [PRD-{FEATURE}, BEH-{FEATURE}, DSG-{FEATURE}]
due: "{DATE?}"
estimate:
  ideal_days: {N}
  realistic_days: {N}
  pessimistic_days: {N}
last_updated: "{DATE}"
---

# TSK-{FEATURE}

## Target BEH Scenarios
- BEH IDs: `{BEH-ID} / {SCENARIO-IDs}`
- 観察ポイント: （例）正常系S-1、異常系S-2、待機系S-3

## TDD Plan
### Red（再現テストを先に書く）
- [ ] 失敗する自動テストを作成（または手順を明文化）
- [ ] 失敗の観察ログ/メトリクスを記録（必要なら）
- 期待失敗内容: （例）HTTP 400 / 文言 / ログキー

### Green（最小実装）
- [ ] テストを通すための最小変更のみ実施
- [ ] 追加の副作用なし（差分レビューで確認）

### Refactor（設計の整理）
- [ ] 重複排除 / 命名整理 / 責務分離
- [ ] テストは常にグリーン維持

## Acceptance Criteria
- [ ] 対象BEHシナリオが自動テストで再現・合格
- [ ] 主要異常系のエラーメッセージとハンドリングが仕様通り
- [ ] ドキュメント（PRD/BEH/DSG/Runbook）更新済み

## Definition of Done (DoD)
- テスト：
  - [ ] Red→Green→Refactor の痕跡（履歴/ログ）が残っている
  - [ ] E2E/Integration/Unit の最低限を満たす
- ドキュメント：
  - [ ] `docs/` 該当箇所の更新／リンク反映
- 運用：
  - [ ] `ops/runbook-{topic}.md` 更新（必要に応じて）

## PR Constraints（AI前提の粒度）
- 差分（+/-）≦ **300行**
- 影響ファイル ≦ **5〜7**
- BEHシナリオ ≦ **3件**

## Risks / Dependencies
- リスク：
- 依存：

## Notes
- メモ、未確定事項