---
id: runbook-{topic}
type: runbook
title: {topic} Runbook
purpose: >
  このRunbookは {topic} に関する標準的な運用・復旧手順を定義する。
status: draft
version: 0.1.0
owners: ["@ops-team"]
related: [TSK-{FEATURE}, ADR-{SEQ}-{topic}]
last_updated: "{DATE}"
---

# {topic} Runbook

## Overview
- 目的：
- 前提条件：
- 対象環境：
- 関連ドキュメント：`TSK-{FEATURE}` / `ADR-{SEQ}-{topic}`

## Preparation
1. （実施前の確認事項）
2. （必要な権限・ツール・環境変数）
3. （事前通知・バックアップ手順）

## Procedure
1. （ステップ1：コマンドや操作）
2. （ステップ2）
3. （ステップ3）

## Verification
- 成功条件：
  - （例）ログに "Deployment succeeded" が出力される
  - （例）サービスのヘルスチェックが200を返す
- 確認コマンド例：
  ```bash
  curl -f https://{service-url}/health
  ```

## Rollback / Recovery
- （失敗時の対応ステップ）
- （ロールバック手順）
- （再実行の条件）

## Contacts / Escalation
- 担当者：
- 連絡経路：
- AI対応窓口（自動再実行や報告連携）：

## Notes
- （補足・Tips・自動化候補など）