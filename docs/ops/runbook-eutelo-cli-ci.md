---
id: runbook-eutelo-cli-ci
type: runbook
title: Eutelo CLI/CI Runbook
purpose: >
  Eutelo の Guard/Check を設定駆動のまま運用するための CLI と GitHub Actions の実行手順をまとめる。
status: draft
version: 0.1.0
owners: ["@team-eutelo"]
related: [TSK-EUTELO-CONFIG-40-CLI-CI]
last_updated: "2025-02-05"
---

# Eutelo CLI/CI Runbook

## Overview
- 目的：config / preset を尊重したまま guard/check を CLI・CI で安全に実行する。
- 前提：Node 18 / `npm ci` で依存関係をインストール済み。`eutelo.config.*` と preset がプロジェクトに入っている。
- 対象：ドキュメントガード（LLM）と静的チェックをトリガする開発者・CI 管理者。
- 環境変数：`EUTELO_GUARD_API_ENDPOINT`, `EUTELO_GUARD_API_KEY`, `EUTELO_GUARD_MODEL`（任意）, `EUTELO_GUARD_DEBUG`（任意）。

## Preparation
1. `npm ci` を実行し、プロジェクトローカルの preset / 依存をインストールする。
2. `.env` または CI の Secret/Vars に LLM 用の環境変数を設定する。
3. 必要に応じて `--config` で使う設定ファイルパスを確認する。

## Procedure
1. **ローカルでの Guard 実行**
   ```bash
   npx eutelo guard docs/product/**/*.md --format=json --warn-only \
     --config eutelo.config.json
   ```
   - preset を切り替えても CLI は自動で `loadConfig()` を呼び、UseCase を 1 回だけ実行する。
2. **ローカルでの Check 実行**
   ```bash
   npx eutelo check --format=json --config eutelo.config.json
   ```
3. **GitHub Actions（`.github/workflows/guard.yml`）**
   - `actions/setup-node@v4` → `npm ci` → `npx eutelo guard ...` の順に実行。
   - 差分ファイルがある場合は `tj-actions/changed-files` の出力を guard に渡し、なければ `inputs.paths` を使用する。
4. **Composite Action（`.github/actions/guard`）を使う場合**
   - 呼び出し元で working-directory / paths / format を入力し、環境変数に LLM 情報を渡す。
   - 内部では `npm ci` の後に `npx eutelo guard` を呼ぶだけの薄いアダプタ。

## Verification
- Guard コマンド終了コード: 0（成功/警告のみ）、2（issues）、3（実行エラー）。
- JSON 出力で `stats.issues` が想定どおりか確認し、CI ではステップの exit code を見る。
- Workflow が preset 切替後も通るか、分岐パス（差分あり／なし）で `npx eutelo guard` が呼ばれているかをログで確認。

## Rollback / Recovery
- 直近の変更で CI が失敗した場合、`.github/workflows/guard.yml` を直前のコミットに戻し再実行。
- LLM 接続エラー時は `EUTELO_GUARD_DEBUG=true` を一時的に有効化し、再実行ログを採取する。

## Contacts / Escalation
- 担当: @team-eutelo
- 連絡: Slack #eutelo-dev / PagerDuty Eutelo オンコール

## Notes
- CLI / CI は UseCase の薄いアダプタに留める。ビジネスロジックをワークフローやアクション側に入れないこと。
- preset 差し替え時は `npm ci` が必須。グローバルインストールされた CLI には依存しない。
