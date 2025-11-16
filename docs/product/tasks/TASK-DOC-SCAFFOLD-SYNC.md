---
id: TASK-DOC-SCAFFOLD-SYNC
type: task
title: Document Scaffold - sync 機能
purpose: >
  `eutelo sync` によって不足ドキュメントのみを非破壊的に生成し、
  CI から `--check-only` で検証できるようにする。
  E2E / Unit / Integration の3層で TDD を行う。
status: closed
version: 0.2
owners: ["@AkhrHysd"]
parent: PRD-DOC-SCAFFOLD
last_updated: "2025-11-14"
---

# TASK-DOC-SCAFFOLD-SYNC  
Document Scaffold - sync 機能

---

## 1. Overview

`eutelo sync` の目的:

- Eutelo 標準構造に照らして「本来存在すべきファイル」を推定する
- 不足しているドキュメントのみテンプレから生成する
- 既存ファイルを一切上書きしない
- `--check-only` で CI から不足状況を検出できる

実装対象パッケージ:

- CLI: `packages/cli`  
- core: `packages/core`（ScaffoldService / TemplateService / ValidationService）  
- distribution: `packages/distribution`（テンプレの存在は前提）

---

## 2. Red（E2E）

### 2.1 不足 PRD の自動生成
- [ ] テスト用プロジェクトを作成（AUTH フィーチャの BEH/DSG は存在、PRD は削除）
- [ ] execa で `eutelo sync` を実行（cwd をフィクスチャに設定）
- [ ] exitCode = 0
- [ ] `eutelo-docs/product/features/AUTH/PRD-AUTH.md` が生成される
- [ ] 既存 BEH/DSG は変更されていないことを確認

### 2.2 すべて揃っている場合の no-op
- [ ] サンプルプロジェクトで全ドキュメントが揃った状態を用意
- [ ] `eutelo sync` 実行で exitCode = 0
- [ ] ファイル変更が一切起きていないこと（タイムスタンプまたは git diff ベースで確認）
- [ ] ログに「No changes」的なメッセージが含まれている

### 2.3 `--check-only` の挙動
- [ ] PRD が不足している状態で `eutelo sync --check-only` を実行
- [ ] exitCode = 1（「不足あり」を意味する）
- [ ] ファイル生成が行われていない
- [ ] stdout に不足ファイル一覧が出力される

### 2.4 上書き禁止の確認
- [ ] 既存 PRD がある状態で `eutelo sync` を実行
- [ ] exitCode = 0
- [ ] 既存 PRD の内容・タイムスタンプに変化がない

---

## 3. Red（Unit / Integration）

### 3.1 core/services/ScaffoldService（Unit）

- [ ] `computeSyncPlan(projectRoot)` が「不足ファイル一覧」を返す
  - 例: `[{ type: "prd", feature: "AUTH", path: "eutelo-docs/..." }, ...]`
- [ ] すべて揃っている場合は空配列を返す
- [ ] 既存ファイルは plan に含まれない

### 3.2 core/services/TemplateService（Unit）

- [ ] 指定された種別（prd/beh/...）と `{FEATURE}` 等からテンプレを解決できる
- [ ] テンプレが見つからない場合は `TemplateNotFound` を投げる

### 3.3 infrastructure/FileSystemAdapter（Integration）

- [ ] `writeIfNotExists(path, content)` が存在しないときのみ書き込む
- [ ] 既存ファイルがある場合 true/false 等で「未書き込み」を返せること

---

## 4. Green（実装）

### 4.1 CLI（packages/cli）

- [ ] Commander.js で `sync` サブコマンドを定義
- [ ] `--check-only` オプションを CLI で受け取る
- [ ] core の `ScaffoldService.sync({ checkOnly })` を呼び出す
- [ ] 戻り値（不足ファイル数・エラー種類）から exit code を決定する
- [ ] ログ整形（人間向け / CI 向け）を実装

### 4.2 core/services/ScaffoldService

- [ ] DSG に記載の「期待構造」定義に基づき、存在すべきパス一覧を生成
- [ ] FileSystemAdapter と TemplateService を使って不足ファイルを非破壊生成
- [ ] checkOnly 時には plan を返すだけにする

### 4.3 core/services/TemplateService

- [ ] distribution パッケージのテンプレを読み込み
- [ ] `expandTemplate(type, context)` で変数展開 `{FEATURE}`, `{DATE}` 等を行う

---

## 5. Refactor

- [ ] 期待構造（features/design/adr/tasks/ops）定義を JSON または TypeScript 定数に切り出す
- [ ] 项目ルート検出ロジックを共通化（init/sync/add/check で使い回し）
- [ ] sync ロジックのうち「構造定義」と「生成実行」を別関数に分割

---

## 6. Definition of Done

- [ ] `eutelo sync` が不足ドキュメントのみ生成し、既存ファイルを一切上書きしない
- [ ] `--check-only` が CI から利用可能（exitCode で判定できる）
- [ ] E2E / Unit / Integration のすべてのテストが Green
- [ ] PRD / DSG / ADR の仕様と完全に整合している