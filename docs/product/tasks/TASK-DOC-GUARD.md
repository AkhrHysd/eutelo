---
id: TASK-DOC-GUARD
type: task
title: Document Guard - LLM Consistency Check 実装タスクリスト
purpose: >
  PRD-DOC-GUARD / BEH-DOC-GUARD / DSG-DOC-GUARD / ADR-DOC-GUARD-0001 に基づき、
  eutelo guard 機能を TDD（Red → Green）で実装するためのタスクを整理する。
status: review
version: 0.1
owners: ["@AkhrHysd"]
parent: PRD-DOC-GUARD
last_updated: "2025-11-15"
---

# TASK-DOC-GUARD
Document Guard — TDD タスクリスト（Red → Green 基準）

---

## 0. 原則（このタスク群全体に適用）

- 仕様はすべて PRD / BEH / DSG / ADR に準拠する。
- 1タスク = 1つ以上の Red → Green テスト完了を基準にする。
- タスクは 300 行以内で完結する粒度に分割する。
- 優先順位は「CLI → Core → Infra → E2E」の流れを基本とする。
- 副作用のある処理（ファイルIO・API call）は adapter / fake を介してテスト可能にする。

---

# 1. CLI 層 — 基礎構築（Red → Green）

## 1-1. `eutelo guard` コマンドのエントリ作成

- [ ] Commander.js で `eutelo guard` サブコマンドを定義する。
- [ ] 暫定実装で "Not implemented" を返す E2E テストを書き、Red を確認する。
- [ ] GuardService の呼び出しポイント（将来の注入先）だけ用意して Green にする。

## 1-2. 引数パーサ（doc paths / flags）実装

- [ ] `eutelo guard file1 file2 --format=json --fail-on-error` の CLI テストを書く（Red）。
- [ ] doc パス配列 / flags を GuardService に渡す実装を行う（Green）。
- [ ] 不正引数時（ファイルなし・未知フラグ）のエラー処理テストを追加する。

## 1-3. exit code のマッピング実装

- [ ] GuardService から返ってくる result（issues 有無 / error 種別）に応じて exit code を決めるテストを書く。
- [ ] BEH 準拠で 0 / 2 / 3 をマッピングする実装を行う。
- [ ] `--warn-only` 時に warning だけなら exit 0 になるテストを追加する。

## 1-4. JSON 形式の整形出力

- [ ] `--format=json` 指定時に JSON を出力する E2E テストを書く。
- [ ] IssueFormatter の JSON をそのまま出力する実装を行う。
- [ ] JSON が parse 可能であること（構造チェック）をテストする。

---

# 2. Core — DocumentModel & Loader（Red → Green）

## 2-1. DocumentLoader（frontmatter + 本文）実装

- [ ] eutelo-docs 配下の PRD / BEH / DSG / ADR ファイルを読み込む Unit テストを書く。
- [ ] frontmatter / content をパースし、Document 型にマッピングする実装を行う。
- [ ] frontmatter 欠落・YAML 破損時のエラーパスをテストする。

## 2-2. 文書タイプの推定（prd / beh / dsg / adr）

- [ ] ファイルパスから type を推定するロジックのテストを書く。
- [ ] `PRD-*.md`, `BEH-*.md`, `DSG-*.md`, `ADR-*-0001.md` を正しく分類する実装を行う。
- [ ] 未知パターンの場合の扱い（例: warning 扱い）を決めてテストする。

## 2-3. バリデーション（frontmatter 必須項目）

- [ ] id / purpose / parent / feature など、doc-guard が必要とするフィールドの有無を検証するテストを書く。
- [ ] 必須項目が欠落している場合に ValidationError を返す実装を行う。
- [ ] BEH の「ファイル読み込みに失敗する」系シナリオとつなげて確認する。

---

# 3. Core — PromptBuilder（Red → Green）

## 3-1. Base Prompt（文書体系ルール）の生成

- [ ] Eutelo 文書体系（PRD/BEH/DSG/ADR の役割）を説明する system prompt を生成するテストを書く。
- [ ] DSG / ADR の記述に沿って Base Prompt を構築する実装を行う。
- [ ] 将来の差し替えに備え、Base Prompt を別モジュールに切り出す。

## 3-2. Document Prompt（文書内容注入）

- [ ] Document[] を受け取り、frontmatter + content を prompt に埋め込むユニットテストを書く。
- [ ] 各 Document について id / parent / purpose / type を明示する実装を行う。
- [ ] 大量の文書（複数 feature）を渡したときの出力構造をテストする。

## 3-3. Task Prompt（期待結果の要求）

- [ ] 「不整合を列挙し、issue/warning/suggestion に分類して返す」指示の生成テストを書く。
- [ ] BEH に記述された異常系（purpose conflict / scope 不足 / ADR 矛盾 / parent 不整合）を含めた指示文を実装する。
- [ ] 将来の diff フォーカス情報を注入できるフックポイントを設けておく。

---

# 4. Core — LLMClient（Red → Green）

## 4-1. LLMClient 抽象インターフェース定義

- [ ] `generate({ prompt, model, temperature, systemPrompt })` のインターフェースに対する型テストを書く。
- [ ] 抽象インターフェース（LLMClient）を定義し、GuardService からはそれだけを見るようにする。

## 4-2. OpenAI Compatible Client 実装

- [ ] 簡易な HTTP mock を用いた API 呼び出しテストを書く。
- [ ] `/v1/chat/completions` 互換 API を叩く実装を行う。
- [ ] endpoint / api-key / model を環境変数から取得する実装を行う。

## 4-3. FakeLLMClient（テスト用）

- [ ] テストで本物の LLM を叩かないようにするため、FakeLLMClient で決め打ちの応答を返すユニットテストを作る。
- [ ] GuardService / Analyzer のテストは FakeLLMClient 経由で完結するようにする。

## 4-4. APIキーエラー検出

- [ ] API_KEY 未設定時に GuardService が exit code 3 相当を返す E2E テストを書く。
- [ ] LLMClient 初期化時に KEY の有無をチェックする実装を行う。
- [ ] エラーメッセージから API-KEY の値が推測できないことを確認する。

---

# 5. Core — Analyzer（Red → Green）

## 5-1. LLM 応答のパース

- [ ] LLM 応答（プレーンテキスト or JSON ライク）を受け、issues/warnings/suggestions に変換するテストを書く。
- [ ] LLM 側フォーマットが多少ブレても最低限の構造化ができるパーサを実装する。

## 5-2. 不整合パターン（purpose conflict / scope 不足）の分類

- [ ] FakeLLMClient に「purpose conflict」を含む応答を返させるテストを書く。
- [ ] Analyzer が conflict / scope不足 / ADR conflict / parentNotFound を type 分類できるよう実装する。
- [ ] BEH のシナリオすべてを Analyzer レベルでカバーする。

---

# 6. Core — IssueFormatter（Red → Green）

## 6-1. CLI 表示用フォーマット

- [ ] issues/warnings/suggestions を CLI で読みやすいテキストに整形するテストを書く。
- [ ] ファイルパス / 種別 / メッセージ / 提案 を含めたテキスト整形を実装する。
- [ ] エラーと警告で強調表現を変える（CIログで判別しやすいようにする）。

## 6-2. JSON 出力フォーマット

- [ ] `--format=json` 用の JSON schema（非厳密）を決め、スナップショットテストを書く。
- [ ] `summary`, `issues`, `warnings`, `suggestions` を含む JSON を返す実装を行う。
- [ ] 将来のフィールド追加に備え、後方互換性を壊さない設計にする。

---

# 7. Application Service — GuardService（Red → Green）

## 7-1. メインフロー構築

- [ ] GuardService の「正常系」（整合性問題なし）E2E 風 Unit テストを書く。
- [ ] DocumentLoader → PromptBuilder → LLMClient → Analyzer → IssueFormatter のチェーンを実装する。
- [ ] BEH の「正常系」シナリオに対応する結果を返せることを確認する。

## 7-2. 対象文書が空のときの挙動

- [ ] 入力ドキュメント配列が空のとき、LLM が呼ばれないことをテストする。
- [ ] "No documents to check" を返し、exit code 0 を返す実装を行う。

## 7-3. LLM 接続エラー時の挙動

- [ ] FakeLLMClient に接続エラーをシミュレートさせるテストを書く。
- [ ] GuardService が exit code 3 とエラーメッセージを返す実装を行う。

## 7-4. 重大 issue 時の exit code 2

- [ ] Analyzer から重大 issue が返ってきた場合のテストを書く。
- [ ] `--fail-on-error` / デフォルトモードで exit 2 にマッピングする実装を行う。

## 7-5. warn-only モード

- [ ] `--warn-only` 指定時に warning のみなら exit 0 を返すテストを書く。
- [ ] issues がある場合でも exit 2 を返さないようモード分岐を実装する。

---

# 8. E2E テスト（execa ベース）

## 8-1. `eutelo guard` コマンドのスモークテスト

- [ ] テスト用フィクスチャプロジェクトで `eutelo guard` を実行し、コマンドが存在することを確認する。
- [ ] 正常系で exit 0 が返ることを確認する。

## 8-2. purpose conflict シナリオ

- [ ] PRD と BEH の purpose が矛盾したフィクスチャを用意する。
- [ ] `eutelo guard` 実行で exit 2 かつ CLI 出力に "purpose conflict" が含まれることを確認する。

## 8-3. scope 不足シナリオ

- [ ] PRD scope に対して BEH シナリオが不足しているケースのフィクスチャを用意する。
- [ ] exit 2 で失敗し、メッセージに scope 不足が含まれることを確認する。

## 8-4. ADR conflict シナリオ

- [ ] ADR と PRD の決定内容が矛盾するフィクスチャを用意する。
- [ ] "ADR conflict detected" が出力され、exit 2 となることを確認する。

## 8-5. APIキー欠落シナリオ

- [ ] API-KEY を unset にした状態で `eutelo guard` を実行する。
- [ ] "API key missing" が表示され、exit 3 となることを確認する。

## 8-6. 不存在ファイル指定シナリオ

- [ ] 存在しないファイルパスを指定して `eutelo guard NOTFOUND.md` を実行する。
- [ ] "File not found" が表示され、exit 3 となることを確認する。

---

# 9. 将来拡張向けのフック（実装は行わない）

## 9-1. diff フォーカス用オプションのプレースホルダ

- [ ] CLI で `--focus-from-diff` オプションを予約し、現在は warning を出して無視する実装を行う。
- [ ] ADR に記載した「全文＋diffフォーカス」構想への入り口であることをコメントに残す。

## 9-2. ExternalCommandLLMClient のスケルトン

- [ ] `ExternalCommandLLMClient` の空実装クラスを定義する（LLMClient 実装だが未使用）。
- [ ] クラスコメントに「CursorCLI / ClaudeCode / CodexCLI 等の backend 候補」としての意図を明記する。
- [ ] 実際の利用は行わず、テストも書かない（将来開発のための箱だけ提供）。

---

# 10. Definition of Done（このタスクリストの完了条件）

- BEH-DOC-GUARD に記述されたすべてのシナリオがテストでカバーされ、Green である。
- PRD / DSG / ADR で定義された要件（全文評価・OpenAI Compatible・exit code 規約）が守られている。
- `eutelo guard {FILES...}` を実行するだけで、LLM ベースの整合性チェック結果を CLI / JSON で取得できる。
- 重大な不整合は exit 2、接続エラーは exit 3、正常系 / warn-only は exit 0 となる。
- 将来の diff フォーカスおよび外部CLI backend 拡張のためのフックが配置されている。