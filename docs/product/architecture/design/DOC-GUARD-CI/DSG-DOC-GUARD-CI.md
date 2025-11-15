---
id: DSG-DOC-GUARD-CI
type: dsg
feature: doc-guard-ci
title: Document Guard CI Integration 設計ガイド
purpose: >
  GitHub Actions 上で eutelo guard を手軽かつ柔軟に実行できるようにするため、
  再利用可能ワークフローおよび Composite Action の設計方針を定義する。
parent: PRD-DOC-GUARD-CI
owners: ["@AkhrHysd"]
status: draft
version: 0.1
last_updated: "2025-11-16"
---

# DSG-DOC-GUARD-CI
Document Guard CI Integration – Architecture & Design

---

## 1. 全体アーキテクチャ

本機能は次の 2 つの配布物で構成される：

### A. 再利用可能ワークフロー（workflow_call）
- メンテナンス性が高く、導入元が YAML 1 行で呼び出せる
- Guard CI 統合の標準パス

### B. Composite Action
- カスタム workflow 内に組み込みたいユーザー向け
- Node セットアップ・CLI インストール・guard 実行を 1 ステップ化

さらに、どちらも内部で共通して

- actions/checkout
- actions/setup-node
- npm install -g @eutelo/cli
- eutelo guard

を実行する。

---

## 2. 再利用可能ワークフロー設計

### 2.1 構造

```
eutelo/eutelo-ci/
  .github/workflows/
    guard.yml   # workflow_call による再利用可能ワークフロー
```

### 2.2 ワークフロー仕様（重要部分）

```
on:
  workflow_call:
    inputs:
      paths:
        type: string
        default: "eutelo-docs/**/*.md"
      working-directory:
        type: string
        default: "."
    secrets:
      EUTELO_GUARD_API_ENDPOINT:
        required: true
      EUTELO_GUARD_API_KEY:
        required: true
```

中で行う処理は以下の通り：

1. checkout  
2. Node セットアップ  
3. `npm i -g @eutelo/cli`  
4. `eutelo guard <paths>` を実行  
   - `--format=text` もしくは inputs で変更  
5. exit code を GitHub Actions の job ステータスとして返す

### 2.3 主なユースケース

- PR に応じて guard 実行
- main への push 時チェック
- workflow_dispatch での手動チェック
- Monorepo での working-directory 適用

---

## 3. Composite Action 設計

### 3.1 目的

- ユーザー独自の CI job 内で `eutelo guard` をステップ単位で使用したい場合に適用
- workflow_call のように job を丸ごと委譲はしたくない場合

### 3.2 構造

```
eutelo/eutelo-guard-action/
  action.yml
```

### 3.3 action.yml の要点

- inputs で paths / format / working-directory を受け取る
- secrets は呼び出し側の env で受け取る
- steps の中で
  - setup-node
  - npm install -g @eutelo/cli
  - eutelo guard
  を実行

---

## 4. secrets / inputs の設計

### Secrets
- `EUTELO_GUARD_API_ENDPOINT`
- `EUTELO_GUARD_API_KEY`
- （拡張）`EUTELO_GUARD_MODEL`

### Inputs
- `paths`  
- `working-directory`  
- `format=text|json`  

→ Monorepo / API の多様性 / logging 設計すべてをカバーする。

---

## 5. ログ設計

### 標準形式（text）
- ファイル一覧
- issue summary
- エラー詳細（文書名・ルール名・メッセージ）
- exit code

### JSON 形式（format=json）
- LLM に渡すログワークフローなどの downstream 用

---

## 6. CI パフォーマンスの考慮

- Node 18/20 を actions/setup-node のキャッシュあり設定で高速化
- npm global install は高速化の余地あり（将来：prebuilt action で回避も検討）
- doc-guard の LLM 呼び出しが支配的なため、guard の側で timeout 管理を行う

---

## 7. 拡張性

将来的に以下が追加可能：

- GitLab / CircleCI / Azure 用テンプレート
- eutelo guard + lint + scaffold のフルパイプライン版 workflow
- doc-guard の diff フォーカスオプション（PR 差分のみを重点チェック）

---

## 8. Definition of Done

- 再利用 workflow を 1 行で導入できる
- Composite Action で guard 単体を使える
- secrets / inputs によって柔軟に環境を切り替えられる
- exit code → CI status が BEH と一致する
- Monorepo に対応
- Eutelo CLI の更新に追随可能な設計
---