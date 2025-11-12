# ⚙️ Ops（Runbook）ガイド

このディレクトリは、プロダクト運用に関する **Runbook・手順書・障害対応指針** を管理します。  
目的は、運用担当者・開発者・AIエージェントが同一の情報を参照できる状態をつくり、  
運用・保守・障害対応を一貫したプロセスで実行できるようにすることです。

---

## 構成

```
ops/
  README.md
  _template-runbook.md
  runbook-{topic}.md
```

- `{topic}` は実行対象や目的を短く表現（例：`deploy`, `backup`, `alert`, `incident` など）。
- Runbook は **1テーマ＝1ファイル** を原則とする。

---

## 運用範囲

| 分類 | 内容 | 例 |
|------|------|----|
| **日常運用** | デプロイ・バックアップ・メトリクス監視など | `runbook-deploy.md`, `runbook-backup.md` |
| **障害対応** | インシデント検知から復旧までの手順 | `runbook-incident.md` |
| **リリース管理** | バージョン更新・リリースノート作成手順 | `runbook-release.md` |
| **CI/CD** | パイプライン・自動化ジョブの実行方法 | `runbook-ci.md` |
| **AIオペレーション** | モデル監視・タスク再実行など | `runbook-ai-monitoring.md` |

---

## 作成ルール

- Runbook は **「観察可能な手順」** として記述する（手順の可視化を最優先）。
- 1ファイルにつき 1目的を扱い、複数目的を含めない。
- 操作・確認・復旧の各ステップを明確に分離する。
- 「責任者」「実行権限」「影響範囲」を明示する。
- `Frontmatter` を付与し、タグ付け・検索・CI整合チェックを可能にする。
- 更新時は `CHANGELOG.md` または Git 履歴で変更理由を残す。
- 自動化可能な手順は、スクリプト／CIジョブへのリンクを記載する。

---

## Frontmatter 共通仕様

```yaml
---
id: runbook-{topic}
type: runbook
title: {topic} Runbook
purpose: >
  （このRunbookの目的と前提）
status: {draft|active|deprecated}
version: {VERSION}
owners: ["@ops-team"]
related: [{TASK-ID}, {ADR-ID}]
last_updated: "{DATE}"
---
```

---

## 推奨構成（本文）

1. **Overview**  
   - 目的・前提・対象環境を説明する。
2. **Preparation**  
   - 実施前に必要な確認事項（アクセス権、バックアップ、通知など）。
3. **Procedure**  
   - 実行ステップを順序立てて記載（CLIコマンド・CIジョブ・UI操作など）。
4. **Verification**  
   - 成功条件・確認方法・ログパターン・メトリクスなど。
5. **Rollback / Recovery**  
   - 想定される失敗時の対処法。
6. **Contacts / Escalation**  
   - 連絡経路・責任者・AIエージェント呼び出し方。
7. **Notes**  
   - 運用ノウハウ・補足。

---

## 運用指針

- Runbook は **「読むため」ではなく「実行するため」** の文書である。  
- すべての手順は **再現性がある状態** を維持する（検証済みのコマンドのみ掲載）。  
- 変更後は CI により構文チェック・Frontmatter 検証を行う。  
- 自動実行対象のRunbookは `automation: true` をFrontmatterに追加可能。
- 日次・週次運用のような定常タスクは、`tasks/` にもリンクを置く。

---

> **目的:**  
> Opsは「動作を守る層」であり、コードの外側にある運用の仕様書。  
> ドキュメントとしてのRunbookは、事故対応・AIオペレーション・再現性のすべての基盤となる。