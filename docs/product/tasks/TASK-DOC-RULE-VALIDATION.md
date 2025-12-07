---
id: TASK-DOC-RULE-VALIDATION
type: task
title: Document Rule Validation 実装タスクリスト
purpose: >
  PRD-DOC-RULE-VALIDATION / BEH-DOC-RULE-VALIDATION / DSG-DOC-RULE-VALIDATION に基づき、
  eutelo validate 機能を TDD（Red → Green）で実装するためのタスクを整理する。
status: draft
version: 0.1
owners: ["@AkhrHysd"]
parent: PRD-DOC-RULE-VALIDATION
last_updated: "2025-01-27"
---

# TASK-DOC-RULE-VALIDATION
Document Rule Validation — TDD タスクリスト（Red → Green 基準）

---

## 0. 原則（このタスク群全体に適用）

- 仕様はすべて PRD / BEH / DSG に準拠する。
- 1タスク = 1つ以上の Red → Green テスト完了を基準にする。
- タスクは 300 行以内で完結する粒度に分割する。
- 優先順位は「CLI → Core → E2E」の流れを基本とする。
- 副作用のある処理（ファイルIO）は adapter / fake を介してテスト可能にする。

---

# 1. CLI 層 — 基礎構築（Red → Green）

## 1-1. `eutelo validate` コマンドのエントリ作成

- [x] Commander.js で `eutelo validate` サブコマンドを定義する。
- [x] 暫定実装で "Not implemented" を返す E2E テストを書き、Red を確認する。
- [x] RuleValidationService の呼び出しポイント（将来の注入先）だけ用意して Green にする。

## 1-2. 引数パーサ（doc paths / flags）実装

- [x] `eutelo validate file1.md file2.md --format=json --fail-on-error` の CLI テストを書く（Red）。
- [x] doc パス配列 / flags を RuleValidationService に渡す実装を行う（Green）。
- [x] 不正引数時（未知フラグ）のエラー処理テストを追加する。

## 1-3. exit code のマッピング実装

- [x] RuleValidationService から返ってくる result（issues 有無 / error 種別）に応じて exit code を決めるテストを書く。
- [x] DSG 準拠で 0 / 1 / 2 をマッピングする実装を行う。
- [x] `--warn-only` 時に warning だけなら exit 0 になるテストを追加する。

## 1-4. JSON 形式の整形出力

- [x] `--format=json` 指定時に JSON を出力する E2E テストを書く。
- [x] IssueFormatter の JSON をそのまま出力する実装を行う。
- [x] JSON が parse 可能であること（構造チェック）をテストする。

## 1-5. CI モード実装

- [x] `--ci` オプションで `--format=json` と `--fail-on-error` が自動有効化されるテストを書く。
- [x] CI モードの実装を行う。

---

# 2. Core — RuleFileLoader（Red → Green）

## 2-1. ルールファイルパスの解決（相対パス）

- [x] プロジェクトルートからの相対パス `rules/prd-validation.md` を解決するテストを書く（Red）。
- [x] パス解決ロジックを実装する（Green）。
- [x] 設定ファイルからの相対パス `./validation-rules/prd.md` を解決するテストを追加する。

## 2-2. ルールファイルパスの解決（絶対パス）

- [x] 絶対パス `/path/to/rules/prd-validation.md` を解決するテストを書く。
- [x] 絶対パスの解決ロジックを実装する。

## 2-3. ルールファイルの読み込み

- [x] ルールファイルを読み込む Unit テストを書く。
- [x] ファイル読み込みロジックを実装する。
- [x] ルールファイルが存在しない場合のエラーパスをテストする。

## 2-4. preset パッケージからのルールファイル読み込み（将来拡張）

- [ ] preset パッケージ内のルールファイルを読み込むテストを書く（将来実装用のプレースホルダー）。
- [ ] 実装は将来拡張として保留。

---

# 3. Core — RuleParser（Red → Green）

## 3-1. Markdown ルールファイルの基本解析

- [x] YAML frontmatter を含む Markdown ルールファイルを解析するテストを書く（Red）。
- [x] frontmatter と本文を分離する実装を行う（Green）。
- [x] frontmatter が存在しない場合のエラーパスをテストする。

## 3-2. Frontmatter Rules の解析

- [x] Frontmatter Rules セクションを解析し、ルール定義に変換するテストを書く。
- [x] Required Fields ルールを解析する実装を行う。
- [x] Field Validation ルールを解析する実装を行う。

## 3-3. Structure Rules の解析

- [x] Structure Rules セクションを解析し、ルール定義に変換するテストを書く。
- [x] Heading Structure ルールを解析する実装を行う。
- [x] Section Requirements ルールを解析する実装を行う。

## 3-4. ルールファイルの構文エラー検出

- [x] 不正な構文のルールファイルで構文エラーを検出するテストを書く。
- [x] 構文エラー検出ロジックを実装する。
- [x] エラーメッセージにファイルパスと行番号を含める実装を行う。

---

# 4. Core — DocumentValidator（Red → Green）

## 4-1. Frontmatter Rules の適用

- [x] Required Fields ルールを適用し、必須項目の欠落を検出するテストを書く（Red）。
- [x] 必須項目チェックの実装を行う（Green）。
- [x] Field Format ルールを適用し、形式エラーを検出するテストを追加する。

## 4-2. Field Format ルールの適用

- [x] Field Format ルール（正規表現、enum など）を適用するテストを書く。
- [x] 形式チェックの実装を行う。
- [x] 形式エラーの詳細メッセージを生成する実装を行う。

## 4-3. Structure Rules の適用

- [x] Heading Structure ルールを適用し、見出しの存在を検証するテストを書く。
- [x] 見出しチェックの実装を行う。
- [x] Section Requirements ルールを適用し、セクションの存在を検証するテストを追加する。

## 4-4. 複数ルールの適用

- [x] 複数のルールを順次適用し、すべての違反を検出するテストを書く。
- [x] ルール適用の集約ロジックを実装する。

---

# 5. Core — IssueFormatter（Red → Green）

## 5-1. CLI 表示用フォーマット

- [ ] issues を CLI で読みやすいテキストに整形するテストを書く。
- [ ] ファイルパス / ルール名 / メッセージ / ヒント を含めたテキスト整形を実装する。
- [ ] エラーと警告で強調表現を変える（CIログで判別しやすいようにする）。

## 5-2. JSON 出力フォーマット

- [ ] `--format=json` 用の JSON schema（非厳密）を決め、スナップショットテストを書く。
- [ ] `summary`, `results`, `issues` を含む JSON を返す実装を行う。
- [ ] 将来のフィールド追加に備え、後方互換性を壊さない設計にする。

---

# 6. Application Service — RuleValidationService（Red → Green）

## 6-1. メインフロー構築

- [x] RuleValidationService の「正常系」（ルール違反なし）E2E 風 Unit テストを書く。
- [x] RuleFileLoader → RuleParser → DocumentValidator → IssueFormatter のチェーンを実装する。
- [x] BEH の「正常系」シナリオに対応する結果を返せることを確認する。

## 6-2. 設定ファイルからのルール取得

- [x] 設定ファイルの `directoryStructure` から `rules` フィールドを取得するテストを書く。
- [x] ドキュメントの `kind` に対応するルールファイルを特定するロジックを実装する。
- [x] `rules` フィールドが指定されていない場合の扱いをテストする。

## 6-3. 対象ドキュメントが空のときの挙動

- [x] 入力ドキュメント配列が空のとき、検証をスキップすることをテストする。
- [x] "No documents to validate" を返し、exit code 0 を返す実装を行う。

## 6-4. ルールファイル読み込みエラー時の挙動

- [x] ルールファイルが存在しない場合のエラーハンドリングをテストする。
- [x] RuleValidationService が exit code 2 とエラーメッセージを返す実装を行う。

## 6-5. ルールファイル構文エラー時の挙動

- [x] ルールファイルの構文エラーを検出し、適切なエラーメッセージを返すテストを書く。
- [x] 構文エラー時に exit code 2 を返す実装を行う。

## 6-6. ルール違反時の exit code 1

- [x] DocumentValidator からルール違反が返ってきた場合のテストを書く。
- [x] `--fail-on-error` / デフォルトモードで exit 1 にマッピングする実装を行う。

## 6-7. warn-only モード

- [x] `--warn-only` 指定時に warning のみなら exit 0 を返すテストを書く。
- [x] error がある場合でも exit 1 を返さないようモード分岐を実装する。

---

# 7. E2E テスト（execa ベース）

## 7-1. `eutelo validate` コマンドのスモークテスト

- [x] テスト用フィクスチャプロジェクトで `eutelo validate` を実行し、コマンドが存在することを確認する。
- [x] 正常系で exit 0 が返ることを確認する。

## 7-2. ルール違反検出シナリオ

- [x] 必須項目が欠落したドキュメントのフィクスチャを用意する。
- [x] `eutelo validate` 実行で exit 1 かつ CLI 出力にエラーメッセージが含まれることを確認する。

## 7-3. 形式エラー検出シナリオ

- [ ] 形式エラーを含むドキュメントのフィクスチャを用意する。
- [ ] exit 1 で失敗し、メッセージに形式エラーが含まれることを確認する。

## 7-4. ルールファイル読み込みエラーシナリオ

- [x] 存在しないルールファイルを指定した設定ファイルのフィクスチャを用意する。
- [x] "Rule file not found" が出力され、exit 2 となることを確認する。

## 7-5. ルールファイル構文エラーシナリオ

- [ ] 構文エラーを含むルールファイルのフィクスチャを用意する。
- [ ] "Syntax error in rule file" が出力され、exit 2 となることを確認する。

## 7-6. JSON 出力シナリオ

- [x] `--format=json` オプションで JSON が出力されることを確認する。
- [x] JSON が parse 可能で、期待される構造を持つことを確認する。

## 7-7. CI モードシナリオ

- [ ] `--ci` オプションで `--format=json` と `--fail-on-error` が自動有効化されることを確認する。

---

# 8. 将来拡張向けのフック（実装は行わない）

## 8-1. Content Rules のプレースホルダ

- [ ] RuleParser で Content Rules セクションを認識するが、検証はスキップする実装を行う。
- [ ] ADR に記載した「Content Rules の将来拡張」構想への入り口であることをコメントに残す。

## 8-2. カスタムバリデーター関数のスケルトン

- [ ] `CustomValidator` の空実装クラスを定義する（将来拡張用）。
- [ ] クラスコメントに「カスタムバリデーター関数のサポート」としての意図を明記する。
- [ ] 実際の利用は行わず、テストも書かない（将来開発のための箱だけ提供）。

---

# 9. Definition of Done（このタスクリストの完了条件）

- BEH-DOC-RULE-VALIDATION に記述されたすべてのシナリオがテストでカバーされ、Green である。
- PRD / DSG で定義された要件（ルールファイル読み込み・解析・検証・exit code 規約）が守られている。
- `eutelo validate [documents...]` を実行するだけで、ユーザー定義ルールに基づく検証結果を CLI / JSON で取得できる。
- ルール違反は exit 1、システムエラーは exit 2、正常系は exit 0 となる。
- `directoryStructure` の `rules` フィールドからルールファイルを読み込み、適用できる。
- ルールファイルのパス解決が正しく動作する（相対パス・絶対パス）。
- ルールファイルの構文エラーを適切に検出・報告できる。
- 将来の Content Rules およびカスタムバリデーター拡張のためのフックが配置されている。

---

