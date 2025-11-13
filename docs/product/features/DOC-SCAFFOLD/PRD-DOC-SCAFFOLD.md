---
id: PRD-DOC-SCAFFOLD
type: prd
feature: doc-scaffold
title: Document Scaffold & CI Integration 機能 PRD
purpose: >
  Eutelo が定義する標準ドキュメント構造を、
  ユーザーの既存プロジェクトに安全かつ非破壊的に追加・維持するための
  スキャフォールドおよびCI補助機能を提供する。
status: approved
version: 0.1
parent: PRINCIPLE-GLOBAL
owners: ["@AkhrHysd"]
tags: ["doc-scaffold", "documentation", "ci"]
last_updated: "2025-11-14"
---

# PRD-DOC-SCAFFOLD

## Purpose
本機能は、Euteloプロジェクトで策定しているドキュメント構造（features / design / contracts / adr / ops など）を  
**既存の外部プロジェクトに対して安全に配布・統合できる仕組み** を提供する。

- 標準構造を「後付け」できる。
- 既に存在する docs/ や architecture/ と衝突しない。
- テンプレート更新時にもユーザー資産を壊さない。
- CIで不足分の検出や構造チェックを自動化できる。

Euteloの「目的と整合した文書体系を維持する」という原則を支えるために存在する。

---

## Background
- 標準化されたドキュメント体系を各プロジェクトに適用したいが、手作業では整合維持が難しい。
- プロジェクト側に既存のdocs/がある場合、衝突や上書きが起きやすい。
- 「テンプレが更新されたのに各プロジェクトに反映されない」問題が起きやすい。
- 手元とCIどちらでもドキュメント構造を自動チェックできる仕組みが必要。

---

## Goals / KPI
- スキャフォールドの非破壊適用成功率：**100%**
- テンプレ同期時の衝突ゼロ（上書き回避率）：**100%**
- CI実行時間：**< 2秒**
- 文書構造チェック（purpose必須チェック等）の検出精度：**> 99%**

---

## Scope

### In Scope
- 標準ドキュメント構造の自動生成コマンド
- 既存プロジェクトに対する「不足分のみ追加」の非破壊スキャフォールド
- PRD/BEH/DSG/ADR/TASK/OPSなど各テンプレの自動配置
- CIでの構造・必須フィールド（例：purpose）チェック
- テンプレ更新時の差分検出（プロジェクト側が古いテンプレを保持しているか判定）
- 上書き事故防止（既存ファイルは必ず保護）
- dry-runによる事前確認

### Out of Scope
- ドキュメント内容そのものの生成（AIによる自動執筆など）
- コード生成
- モデルスキーマ生成（別機能）

---

## Requirements

### Functional Requirements（FR）

#### A. スキャフォールド基盤（init/sync）
- FR-01: `eutelo init` により、Eutelo標準ドキュメント構造一式を初期生成できる
- FR-02: `eutelo sync` により、不足しているテンプレートファイルのみを追加生成できる
- FR-03: 既存プロジェクトの docs/ および architecture/ を破壊しない（上書き禁止）
- FR-04: テンプレート更新時に、更新対象ファイルを検出してユーザーに提示できる
- FR-05: dry-run と verbose モードを提供し、生成内容を明示できる

---

#### B. **テンプレートが存在する種類のみ add コマンドで生成できること**  
（この機能の中核要件）

**対象：PRD / BEH / SUB-PRD / SUB-BEH / DSG / ADR / TASK / OPS**

テンプレが存在する場合に *のみ* add 可能であり、  
テンプレの無い種類はスコープ外。

##### 1) Features 層（PRD / BEH / SUB）
- FR-10: `eutelo add prd {FEATURE}` により PRDテンプレートから  
  `PRD-{FEATURE}.md` を生成し、frontmatterを自動埋め込みできる
- FR-11: `eutelo add beh {FEATURE}` により BEHテンプレートを生成し、  
  PRD と自動で parent/関連リンクを整合させる
- FR-12: `eutelo add sub-prd {FEATURE} {SUB}` により SUB-PRD テンプレを生成できる
- FR-13: `eutelo add sub-beh {FEATURE} {SUB}` により SUB-BEH テンプレを生成できる
- FR-14: `eutelo add feature {FEATURE}` で PRD/BEH/DSG をまとめて生成できる  
（DSGテンプレが存在する場合のみ生成）

##### 2) Architecture / Design 層（DSG）
- FR-20: `eutelo add dsg {FEATURE}` により DSGテンプレートが存在する場合に限り  
  architecture/design/{FEATURE}/ にテンプレ生成できる  

##### 3) ADR
- FR-30: `eutelo add adr {FEATURE}` により ADRテンプレートが存在する場合に限り  
  `ADR-{FEATURE}-{連番}.md` を自動生成する  

##### 4) Tasks / Ops（テンプレがある場合のみ）
- FR-40: `eutelo add task {NAME}` により、tasks/ にテンプレ生成できる  
- FR-41: `eutelo add ops {NAME}` により、ops/ にテンプレ生成できる  

---

#### C. テンプレート変数展開・自動補完
- FR-50: `{FEATURE}`, `{SUB}`, `{DATE}`, `{ID}`, `{VERSION}`, `{PARENT}` など  
  テンプレ内の変数はすべて自動展開される
- FR-51: frontmatter の `id/title/feature/date/parent` は全生成で自動付与
- FR-52: 既存ファイルがある場合は絶対に上書きしない（衝突回避）
- FR-53: テンプレが存在しない種類の add コマンド呼び出しはエラーとなる  

---

#### D. CI統合
- FR-60: CIでスキャフォールドチェック（不足テンプレ・構造不整合）を検出できる
- FR-61: purpose の有無・整合規則の静的チェックが可能
- FR-62: 階層・命名パターン（features/{FEATURE}/PRD-{FEATURE}.mdなど）を検証できる
- FR-63: CIで `eutelo sync` を自動実行し、差分をPRとして提示できる

### Non-Functional Requirements（NFR）
- NFR-01: コマンド実行は高速（500ms以内）であること
- NFR-02: CIジョブはキャッシュを利用し、2秒以内で完了すること
- NFR-03: Node 18+ で動作する環境（CLI・CIともに）
- NFR-04: 失敗があっても既存ファイルを壊さない設計であること
- NFR-05: ローカル差分が不明瞭にならないよう、全ての自動変更はPRまたはパッチとして提示されること

---

## Success Criteria
- ユーザーが既存プロジェクトへドキュメント構造を即時適用できる
- 衝突や上書き事故が発生しない
- CIでの自動チェックにより構造不整合が検出できる
- テンプレート更新時にプロジェクト側へ反映すべき差分が明確に示される
- ドキュメント体系の「説明可能性」が長期にわたり維持される

---

## Dependencies / Related
- Behavior: `../doc-scaffold/BEH-doc-scaffold.md`
- Design: `../../architecture/design/doc-scaffold/DSG-doc-scaffold.md`
- ADR: `../../architecture/adr/doc-scaffold/ADR-doc-scaffold-0001.md`
- Principle: `../../../philosophy/principles/global-principles.md`

---

## Risks / Assumptions
- 各プロジェクトの独自構造が複雑すぎる場合、テンプレ適用が完全に自動化できない可能性がある
- テンプレート更新頻度が高い場合、同期の負荷が上がる
- CI環境ごとの挙動差によりスキャフォールド互換性問題が発生する可能性

---

## Notes
- この機能は「Euteloの標準ドキュメント体系を広く普及させるための基盤」となる。
- 特に「非破壊導入」と「CIによる維持」がキモであり、ユーザー体験の大部分を左右する。

---

## References
- Eutelo Document Principles  
- Directory Guide  
- PRD/BEH/DSG テンプレート群  

---