---
id: TASK-DOC-GUARD-GRAPH-INTEGRATION
type: task
title: Guard × Graph 連携 - 関連ドキュメント自動探索 実装タスクリスト
purpose: >
  PRD / BEH / DSG-DOC-GUARD-GRAPH-INTEGRATION に基づき、
  guard コマンドが graph 機能を活用して関連ドキュメントを自動収集する機能を
  TDD（Red → Green）で実装するためのタスクを整理する。
status: draft
version: 0.1
owners: ["@AkhrHysd"]
parent: PRD-DOC-GUARD-GRAPH-INTEGRATION
last_updated: "2025-11-27"
---

# TASK-DOC-GUARD-GRAPH-INTEGRATION

Guard × Graph 連携 — TDD タスクリスト（Red → Green 基準）

---

## 0. 原則（このタスク群全体に適用）

- 仕様はすべて PRD / BEH / DSG-DOC-GUARD-GRAPH-INTEGRATION に準拠する。
- 1タスク = 1つ以上の Red → Green テスト完了を基準にする。
- タスクは 300 行以内で完結する粒度に分割する。
- 優先順位は「Core（Graph）→ Core（Guard）→ CLI → E2E」の流れを基本とする。
- 既存の graph / guard 実装との整合性を保つ。

---

# 1. Core — RelatedDocumentResolver 実装（Red → Green）

## 1-1. RelatedDocumentResolver 型定義とスケルトン作成

- [ ] `ResolveRelatedOptions` / `ResolvedRelatedDocument` / `ResolveRelatedResult` 型を定義する。
- [ ] `RelatedDocumentResolver` クラスのスケルトンを作成する。
- [ ] 空の resolve() メソッドが呼び出し可能であることを確認するテストを書く。

## 1-2. 単一ドキュメントの parent 取得

- [ ] 起点ドキュメントの parent ID を取得するテストを書く（Red）。
- [ ] frontmatter から parent を読み取り、対応するドキュメントパスを解決する実装を行う（Green）。
- [ ] parent が "/" （ルート）の場合は収集しないことをテストする。

## 1-3. 単一ドキュメントの related 取得

- [ ] 同一 feature 内の関連ドキュメント（BEH/DSG 等）を取得するテストを書く（Red）。
- [ ] GraphBuilder で構築した adjacency から related エッジを辿る実装を行う（Green）。
- [ ] related が空の場合に空配列を返すことをテストする。

## 1-4. depth オプションの実装

- [ ] depth=1 で 1-hop のみ収集するテストを書く（Red）。
- [ ] depth=2 で 2-hop まで収集するテストを書く（Red）。
- [ ] ImpactAnalyzer を活用した BFS で depth 制限を実装する（Green）。
- [ ] depth=0 の場合は起点のみ返すことをテストする。

## 1-5. all オプションの実装

- [ ] all=true で深さ無制限に収集するテストを書く（Red）。
- [ ] 全ノード到達まで探索する実装を行う（Green）。
- [ ] 100 ノード上限で停止することをテストする。

## 1-6. direction オプションの実装

- [ ] direction=upstream で parent 方向のみ収集するテストを書く（Red）。
- [ ] direction=downstream で子ドキュメント方向のみ収集するテストを書く（Red）。
- [ ] direction=both で双方向収集するテストを書く（Red）。
- [ ] ImpactAnalyzer に direction オプションを追加して実装する（Green）。

## 1-7. 循環参照の検出と回避

- [ ] A → B → A の循環参照が存在する場合のテストを書く（Red）。
- [ ] visited セットで重複訪問を防ぐ実装を行う（Green）。
- [ ] 循環検出時に warnings に追加することをテストする。

## 1-8. 存在しない parent の処理

- [ ] parent ID が存在しないドキュメントを参照している場合のテストを書く（Red）。
- [ ] dangling edge として警告を追加し、処理を続行する実装を行う（Green）。

---

# 2. Core — ImpactAnalyzer 拡張（Red → Green）

## 2-1. direction オプションの追加

- [ ] `ImpactAnalysisOptions` に `direction` フィールドを追加する。
- [ ] direction=upstream で incoming エッジのみ辿るテストを書く（Red）。
- [ ] direction=downstream で outgoing エッジのみ辿るテストを書く（Red）。
- [ ] analyze() メソッドに direction フィルタリングを実装する（Green）。

## 2-2. includeRelations オプションの追加

- [ ] 特定の relation 種別（parent/related/mentions）のみ辿るテストを書く（Red）。
- [ ] analyze() に relation フィルタリングを実装する（Green）。

---

# 3. Core — GuardService 拡張（Red → Green）

## 3-1. RunGuardOptions に relatedOptions を追加

- [ ] `relatedOptions` 型定義を追加する。
- [ ] GuardService.run() が relatedOptions を受け取れることをテストする（Red）。
- [ ] relatedOptions パラメータを受け取る実装を行う（Green）。

## 3-2. RelatedDocumentResolver との統合

- [ ] GuardService コンストラクタに RelatedDocumentResolver を注入可能にする。
- [ ] run() 内で関連ドキュメントを収集するテストを書く（Red）。
- [ ] DocumentLoader 呼び出し前に関連ドキュメントを収集・追加する実装を行う（Green）。

## 3-3. 関連収集の有効/無効切り替え

- [ ] relatedOptions.enabled=false で関連収集をスキップするテストを書く（Red）。
- [ ] enabled フラグによる条件分岐を実装する（Green）。
- [ ] デフォルト値（enabled=true, depth=1）をテストする。

## 3-4. 収集結果のログ出力

- [ ] 収集された関連ドキュメント情報を GuardRunResult に含めるテストを書く（Red）。
- [ ] `relatedDocuments` フィールドを GuardRunResult に追加する実装を行う（Green）。

## 3-5. 関連収集失敗時のフォールバック

- [ ] グラフ構築に失敗した場合のテストを書く（Red）。
- [ ] 警告を出力して指定ドキュメントのみでチェックを続行する実装を行う（Green）。

---

# 4. Core — DocumentLoader 拡張（Red → Green）

## 4-1. DocumentLoadOptions の追加

- [ ] `resolveRelated` / `depth` / `all` オプションを追加する。
- [ ] loadDocuments() がオプションを受け取れることをテストする（Red）。
- [ ] オプションを受け取る実装を行う（Green）。

## 4-2. RelatedDocumentResolver 呼び出し

- [ ] resolveRelated=true の場合に関連ドキュメントを収集するテストを書く（Red）。
- [ ] RelatedDocumentResolver を呼び出して結果をマージする実装を行う（Green）。

---

# 5. CLI — guard コマンド拡張（Red → Green）

## 5-1. --with-related / --no-related オプション追加

- [ ] `--no-related` オプションで関連収集を無効化するテストを書く（Red）。
- [ ] Commander.js でオプションを定義する実装を行う（Green）。
- [ ] デフォルトで関連収集が有効であることをテストする。

## 5-2. --depth オプション追加

- [ ] `--depth=2` で depth=2 が GuardService に渡されるテストを書く（Red）。
- [ ] Commander.js でオプションを定義し、relatedOptions に変換する実装を行う（Green）。
- [ ] デフォルト値（depth=1）をテストする。

## 5-3. --all オプション追加

- [ ] `--all` で all=true が GuardService に渡されるテストを書く（Red）。
- [ ] Commander.js でオプションを定義する実装を行う（Green）。
- [ ] --depth と --all の同時指定時は --all が優先されることをテストする。

## 5-4. 関連収集ログの表示

- [ ] 関連ドキュメント収集時にログを表示するテストを書く（Red）。
- [ ] "Resolving related documents..." "Found N related document(s)" を表示する実装を行う（Green）。
- [ ] --format=json 時はログを抑制することをテストする。

## 5-5. JSON 出力への relatedDocuments 追加

- [ ] `--format=json` で relatedDocuments が出力されるテストを書く（Red）。
- [ ] JSON フォーマッタに relatedDocuments を含める実装を行う（Green）。

---

# 6. CLI — graph related コマンド新規作成（Red → Green）

## 6-1. graph related コマンドのエントリ作成

- [ ] Commander.js で `eutelo graph related <document>` サブコマンドを定義する。
- [ ] 暫定実装で "Not implemented" を返す E2E テストを書き、Red を確認する。
- [ ] RelatedDocumentResolver の呼び出しポイントを用意して Green にする。

## 6-2. 引数・オプションパーサ実装

- [ ] `eutelo graph related docs/PRD.md --depth=2 --direction=upstream` のテストを書く（Red）。
- [ ] 引数とオプションを RelatedDocumentResolver に渡す実装を行う（Green）。

## 6-3. テキスト形式出力

- [ ] 関連ドキュメント一覧をテーブル形式で表示するテストを書く（Red）。
- [ ] ID / hop / via / direction / path を整形して表示する実装を行う（Green）。

## 6-4. JSON 形式出力

- [ ] `--format=json` で JSON 出力するテストを書く（Red）。
- [ ] JSON フォーマッタを実装する（Green）。

## 6-5. エラーハンドリング

- [ ] 存在しないドキュメントを指定した場合のテストを書く（Red）。
- [ ] "Document not found" エラーを表示し exit 1 で終了する実装を行う（Green）。

---

# 7. E2E テスト（execa ベース）

## 7-1. guard --with-related のスモークテスト

- [ ] テスト用フィクスチャで `eutelo guard docs/PRD.md` を実行する。
- [ ] 関連ドキュメントが収集されることをログで確認する。
- [ ] exit code が正常であることを確認する。

## 7-2. 単一ドキュメントでの整合性エラー検出

- [ ] PRD と BEH に purpose 矛盾があるフィクスチャを用意する。
- [ ] `eutelo guard docs/PRD.md` で BEH が自動収集され、整合性エラーが検出されることを確認する。
- [ ] exit code 2 が返されることを確認する。

## 7-3. --no-related での関連収集スキップ

- [ ] `eutelo guard docs/PRD.md --no-related` を実行する。
- [ ] 関連ドキュメントが収集されないことを確認する。
- [ ] 単一ドキュメントのみが LLM に送信されることを確認する。

## 7-4. --depth=2 での 2-hop 収集

- [ ] SUB-PRD → PRD → PRD-CORE の階層を持つフィクスチャを用意する。
- [ ] `eutelo guard docs/SUB-PRD.md --depth=2` で PRD-CORE まで収集されることを確認する。

## 7-5. --all での全関連収集

- [ ] 深い階層（5-hop 以上）のフィクスチャを用意する。
- [ ] `eutelo guard docs/LEAF.md --all` で全先祖が収集されることを確認する。

## 7-6. graph related コマンドのスモークテスト

- [ ] `eutelo graph related docs/PRD.md` を実行する。
- [ ] 関連ドキュメント一覧がテーブル形式で表示されることを確認する。
- [ ] exit code 0 が返されることを確認する。

## 7-7. graph related --format=json

- [ ] `eutelo graph related docs/PRD.md --format=json` を実行する。
- [ ] JSON が parse 可能であることを確認する。
- [ ] expected フィールド（id, hop, via, direction）が含まれることを確認する。

## 7-8. 循環参照シナリオ

- [ ] A ↔ B の循環参照があるフィクスチャを用意する。
- [ ] `eutelo guard docs/A.md` で無限ループせずに完了することを確認する。
- [ ] "Circular reference detected" の警告が表示されることを確認する。

## 7-9. パフォーマンス確認（depth=2, 50 ドキュメント規模）

- [ ] 50 ドキュメント規模のフィクスチャを用意する。
- [ ] `eutelo guard --depth=2` の関連収集が 500ms 以内に完了することを確認する。

---

# 8. 将来拡張向けのフック（実装は行わない）

## 8-1. キャッシュ機構のスケルトン

- [ ] GraphCache クラスのスケルトンを定義する（実装は空）。
- [ ] 将来の CI 間キャッシュ共有のための入り口を用意する。
- [ ] コメントに意図を明記する。

## 8-2. 重要度フィルタリングのスケルトン

- [ ] RelatedDocumentResolver に `priorityFilter` オプションのプレースホルダを追加する。
- [ ] 将来の LLM 入力最適化のための入り口を用意する。
- [ ] 現在は warning を出して無視する実装を行う。

---

# 9. Definition of Done（このタスクリストの完了条件）

- BEH-DOC-GUARD-GRAPH-INTEGRATION に記述されたすべてのシナリオがテストでカバーされ、Green である。
- PRD / DSG で定義された要件（depth/all オプション、graph related コマンド）が実装されている。
- `eutelo guard <document>` を実行するだけで、関連ドキュメントが自動収集され整合性チェックが機能する。
- `eutelo graph related <document>` で関連ドキュメント一覧を確認できる。
- 関連ドキュメント探索は 500ms 以内に完了する（depth=2、50 ドキュメント規模）。
- 循環参照・収集上限などのエッジケースが適切にハンドリングされている。

---

