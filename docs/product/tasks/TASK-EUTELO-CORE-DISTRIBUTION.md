---
id: TASK-EUTELO-CORE-DISTRIBUTION
type: task
feature: EUTELO-CORE
title: "Eutelo Distribution: 実装タスクリスト"
owners: ["AkhrHysd"]
status: draft
last_updated: "2025-11-13"
---

## 🎯 Goal
Eutelo の標準ドキュメントテンプレートと構成ガイドを、  
公開 npm パッケージ **@eutelo/distribution** として配信可能な状態にする。

---

# 1. パッケージ基盤の整備（Directory / Base Files）

## 1-1. パッケージ初期セットアップ
- [x] `packages/distribution/` ディレクトリを作成する
- [x] `package.json` を初期化し、`name: "@eutelo/distribution"` を設定する
- [x] MIT LICENSE を配置する
- [x] 初期版 README（WIP）を作成する  
  - 目的 / 利用範囲 / 配布物概要を含む

## 1-2. DSG準拠のディレクトリ作成
- [x] `/templates/` を作成する
- [x] `/config/` を作成する
- [x] `/examples/` を作成する（例示のみに留める）
- [x] `CHANGELOG.md` を配置する

---

# 2. テンプレートとガイドの配置

## 2-1. ドキュメントテンプレート
- [x] PRD テンプレートを配置する
- [x] BEH テンプレートを配置する
- [x] DSG テンプレートを配置する
- [x] ADR テンプレートを配置する
- [x] TASK テンプレートを配置する

## 2-2. 構成ガイド
- [x] `DIRECTORY_GUIDE.md` を `/config/` に配置する
- [x] 命名規約・配置規約が PRD/DSG と矛盾しないか確認する

## 2-3. 参考資料（例示）
- [x] `/examples/ci/` に参考用ワークフローファイル（中身は空 or コメントのみ）を配置する
- [x] `/examples/scaffold/` に構成例（実装なし）を配置する

---

# 3. 配信方式・運用ルールの反映

## 3-1. パッケージ公開設定
- [x] `package.json` に `publishConfig`（必要なら）を追加する  
- [x] `files` フィールドに配布対象ディレクトリを明記する  
- [x] 推奨 registry が npm public であることを README に記述する

## 3-2. バージョニング
- [x] `version` を SemVer で初期設定する（例: 0.1.0）
- [x] CHANGELOG template（Added/Changed/Fixed/Removed）を追記する

※バージョニングの判断基準は ADR-0106 に準拠  
※ここでは「ルール文書化」のみ。CIの実装はスコープ外

---

# 4. ADR との整合チェック

## 4-1. Namespace
- [x] `@eutelo/distribution` の命名が全ファイルで統一されているか確認する（ADR-0108）

## 4-2. Node / Build
- [x] Node 20.x サポート範囲の記載が README に含まれているか確認する（ADR-0101）  
- [x] 現段階でビルド不要である旨を README に明記する（ADR-0102）

## 4-3. Publishing
- [x] 公開方針（npm public + provenance署名）が README と DSG の両方に反映されているか確認する（ADR-0105）

---

# 5. README（完成版への改修）

## 5-1. セクションごとに細粒度で作成
- [x] 「目的（Why）」を書き直す
- [x] 「インストール / 使い方」セクションを追加する
- [x] 「配布内容一覧（templates / config / examples）」を書き出す
- [x] 「バージョニング方針（ADR-0106）」を記載する
- [x] 「公開戦略（ADR-0105）」を記載する
- [x] 「対応 Node.js（ADR-0101）」を記載する
- [x] 「ライセンス（MIT）」を記載する

---

# 6. 最終整合レビュー

## 6-1. 文書統合チェック
- [ ] SUB-PRD / DSG / ADR で矛盾がないか確認する  
- [ ] パッケージ内の README と DSG の説明が一致しているか確認する  
- [ ] 配布対象以外のファイルが含まれていないか `files` フィールドで再確認する  


---

# 7. 公開ステップ（※実装はスコープ外だが、ToDo として記録）

- [ ] CI 内で provenance 署名つき `npm publish` を行う手順を定義する（例示のみ）  
- [ ] Git タグ（vX.Y.Z）発行ルールを docs に追加する  