---
id: TASK-DOC-LINT
type: task
title: Document Lint — Static Analysis TDD Task Breakdown
purpose: >
  doc-lint（静的解析）機能を、Core / ESLint / Biome / CLI の順に
  Red → Green で実装するためのタスクを整理する。
status: draft
version: 0.1
owners: ["@AkhrHysd"]
parent: PRD-DOC-LINT
last_updated: "2025-11-16"
---

# TASK-DOC-LINT  
Document Lint – TDD タスクリスト（ESLint / Biome）

---

# 0. 原則

- Red → Green の TDD  
- 1 タスク 300 行以内  
- Core → ESLint → Biome → CLI の順  
- 非破壊・読み取り専用  
- LLM 不使用  
- doc-scaffold / doc-guard と独立

---

# 1. Core — FrontmatterParser

## 1-1. frontmatter 抽出
- [ ] 先頭の `---` を検出し YAML を抽出するテスト（Red）
- [ ] parse 実装（Green）
- [ ] frontmatter が先頭でない場合にエラー

## 1-2. 必須フィールドの検証
- [ ] id / type / feature / purpose / parent 欠落ケースのテスト
- [ ] 各フィールドの存在チェック実装

## 1-3. 未知キー検出
- [ ] 未知フィールドで warning を返すテスト
- [ ] allowed keys リストで検証

---

# 2. Core — StructureAnalyzer

## 2-1. ファイルパスから期待値を推定
- [ ] PRD / BEH / DSG / ADR のパス命名テスト
- [ ] RegExp による type / feature 推定

## 2-2. frontmatter との整合性比較
- [ ] type mismatch のテスト
- [ ] feature mismatch のテスト
- [ ] idPattern 不一致テスト

---

# 3. Core — RuleEngine

## 3-1. ルールの実行フレーム
- [ ] rule の登録と集約テスト
- [ ] 全 rule を純関数として実装

## 3-2. 個別 rule 実装
- [ ] ruleRequiredFields  
- [ ] ruleIdFormat  
- [ ] ruleParentExists  
- [ ] ruleTypeMatchesPath  
- [ ] ruleUnknownFields  
- [ ] ruleFrontmatterTop  
- [ ] ruleHasH1Heading  

（それぞれ Red → Green）

---

# 4. ESLint プラグイン

## 4-1. ESLint rule adapter
- [ ] `.md` / `.mdx` を処理するテスト
- [ ] Core の Issue を ESLint の context.report に変換

## 4-2. recommended 設定
- [ ] plugin:eutelo-docs/recommended が動作するテスト

---

# 5. Biome プラグイン

## 5-1. Biome Diagnostics 変換
- [ ] Core → Biome の diagnostic 変換テスト
- [ ] recommended プリセットの読み込みテスト

---

# 6. CLI — `eutelo lint`

## 6-1. 基本動作
- [ ] `eutelo lint` のスモーク E2E（execa）
- [ ] RuleEngine の結果を CLI 出力

## 6-2. exit code
- [ ] エラーあり → exit 1
- [ ] 問題なし → exit 0

## 6-3. JSON 出力
- [ ] `--format=json` の構造テスト

---

# 7. 仕上げ

## 7-1. VS Code 動作確認
- ESLint / Biome を利用した editor 統合の manual verify

## 7-2. パフォーマンス最適化
- キャッシュ導入で < 300ms を実現

---

# 8. Definition of Done

- Core でルールが 100% 検出される  
- ESLint / Biome / CLI が全て Core を使用  
- exit code / 表示 / 設定が BEH に完全一致  
- CI で高速に動作（300ms以内）  

---