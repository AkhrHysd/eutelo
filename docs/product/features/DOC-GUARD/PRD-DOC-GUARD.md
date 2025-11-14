---
id: PRD-DOC-GUARD
type: prd
feature: doc-guard
title: Document Guard & LLM Consistency Check 機能 PRD
purpose: >
  eutelo-docs 内の文書内容が Eutelo の原則・ルール・親子関係に
  一貫して整合しているかを、LLM を用いて検証する仕組みを提供する。
  CI および手動実行の両方で利用可能とし、変更検出時に自動レビューを行い、
  問題点を指摘・要約することで品質を維持する。
status: draft
version: 0.1
parent: PRINCIPLE-GLOBAL
owners: ["@AkhrHysd"]
tags: ["doc-guard", "llm-check", "documentation"]
last_updated: "2025-11-14"
---

# PRD-DOC-GUARD  
Document Guard & LLM Consistency Check

---

## Purpose

本機能は、`eutelo-docs/` 内の文書内容（PRD / BEH / DSG / ADR 等）が  
**Eutelo の文書体系・原則・parent 関係 / 目的 / ルール** に整合しているかを  
LLM によってチェックする仕組みを提供する。

これにより：

- ドキュメントの「説明可能性」を長期間維持  
- 各文書の purpose / scope / parent とのズレを早期発見  
- PRレビューと CI の両面から品質担保  
- ドキュメント変更がプロダクトの意図と整合しているかを判断できる

Doc Scaffold（構造の非破壊生成）と補完しあい、  
Eutelo 全体の文書体系の **品質保証層** を担う。

---

## Background

- スキャフォールドにより「構造」は揃えられるが、  
  「内容の整合性」は依然として人間依存で品質が揺らぎやすい。
- PRD と BEH の purpose が食い違う、  
  DSG が PRD の scope と不一致になるなどの問題が発生する。
- 人手によるレビューでは網羅しきれず、修正漏れが起きやすい。
- LLM を活用すれば：
  - parent 体系の整合  
  - purpose/scope の矛盾  
  - 各文書の役割逸脱  
  を静的ルールと組み合わせて自動判定できる。

---

## Goals / KPI

- 文書整合性チェックの自動化率 **100%**
- LLM 応答の要約品質（Precision） **> 90%**
- チェック実行時間 **< 5秒**（LLM 呼び出し除く）
- CI での適用率 **100%**
- “整合エラーの未検出” の削減 **> 95%**

---

## Scope

### In Scope

- LLM による文書整合性チェック機能の提供  
- CLI コマンド: `eutelo guard`  
- CI 用オプション: `--ci`, `--json`, `--fail-on-error`, `--warn-only`  
- ユーザーが指定可能な API endpoint / API-KEY  
- Eutelo ルールセットに基づくチェック観点の生成  
- PRD / DSG / BEH / ADR の整合検証  
- parent / id / purpose / scope の整合性  
- LLM 応答のログ・JSON 形式での整形  
- exit code 制御（fail / warn / success）  
- ドキュメント差分時のみチェックする軽量モード

### Out of Scope

- ドキュメントの自動修正（提案は warn として出すが変更は行わない）  
- 整合性の完全形式的証明  
- モデル選定（ユーザー側で任意設定）  
- LLM そのものの提供（外部接続のみ）
- doc-guard は ‘入力対象文書の選定’ を行わない。
- 対象選定は CLI 呼び出し元（ユーザー／CI）が決定し、doc-guard は渡された文書に対してのみ整合性チェックを行う。

---

## Requirements

### Functional Requirements（FR）

- **FR-01**: `eutelo guard` コマンドで LLM チェックを実行できる
- **FR-02**: CI では `--ci` `--json` `--fail-on-error` が利用できる
- **FR-03**: doc-scaffold が生成する構造に依存し、各文書を自動抽出する
- **FR-04**: LLM に送るプロンプトは Eutelo ルールに基づいて自動生成される
- **FR-05**: PRD ↔ BEH ↔ DSG ↔ ADR 間の整合をチェックする
- **FR-06**: 親文書（parent）/ 目的（purpose）との矛盾を検出できる
- **FR-07**: LLM の応答内容を解析し、問題点を構造化して返す
- **FR-08**: exit code で「fail / warn / success」を表現する
- **FR-09**: API endpoint / key は環境変数 or 設定ファイルから取得できる
- **FR-10**: ドキュメント差分（git diff）を解析し、差分モードでチェック可能

### Non-Functional Requirements（NFR）

- **NFR-01**: チェック実行時間 < 5秒（LLM 呼び出しを除く）
- **NFR-02**: JSON 出力は CI で parse 可能な安定構造を持つ
- **NFR-03**: Node 18+ で動作
- **NFR-04**: 外部接続エラー時は graceful なエラーメッセージで中断
- **NFR-05**: API-KEY をログに出力しない
- **NFR-06**: diff モードは変更のない時は exit 0 で高速終了

---

## Success Criteria

- PRD / BEH / DSG / ADR 間の目的・parent の整合不一致を自動的に検出できる
- CI で整合エラーを検出し、PR の段階で阻止できる
- LLM によるレビュー内容が人間のレビューと同等以上の精度となる
- JSON 形式で詳細レポートが得られ、PR コメントにも転記しやすい
- 設定（fail / warn）に応じて適切に exit code が制御される

---

## Dependencies / Related

- Design: `../../architecture/design/doc-guard/DSG-doc-guard.md`
- Behavior: `../doc-guard/BEH-doc-guard.md`
- ADR: `../../architecture/adr/doc-guard/ADR-doc-guard-0001.md`
- Doc Scaffold: `PRD-DOC-SCAFFOLD`
- Principles: `../../../philosophy/principles/global-principles.md`

---

## Risks / Assumptions

- LLM の応答品質が一定でない可能性
- 外部APIがレート制限・障害を起こした場合 CI が失敗する
- モデル・プロンプト品質に依存するため、改善余地が残る
- ユーザープロジェクトの文書量が多い場合、コストが増大する

---

## Notes

- 「文書の整合性チェック」は doc-scaffold の「構造保証」と対をなす概念である  
- 将来的には「purpose の意味的整合判定」「parent 体系の高度検証」  
  などへ発展可能  
- LLM モデルは OpenAI, Anthropic, Local LLM など自由に設定できる設計を想定

---

## References

- Eutelo Document Philosophy  
- Doc Scaffold PRD / DSG  
- LLM prompt engineering に関する社内標準  
- CI / CLI 設計ガイド

---