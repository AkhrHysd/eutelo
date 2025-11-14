---
id: DSG-DOC-GUARD
type: dsg
feature: doc-guard
title: Document Guard & LLM Consistency Check 設計ガイド
purpose: >
  eutelo-docs 内の文書内容が Eutelo の原則・purpose・parent 構造と
  整合しているかを、外部 LLM を利用して検証する機能の内部設計方針を定義する。
status: draft
version: 0.1
parent: PRD-DOC-GUARD
owners: ["@AkhrHysd"]
last_updated: "2025-11-14"
---

# DSG-DOC-GUARD  
Design Specification Guide — Document Guard

---

## 1. 概要

Document Guard（doc-guard）は、`eutelo-docs/` 内の文書内容に対し  
**外部 LLM を利用した内容整合性チェック** を行う仕組みを提供する。

doc-scaffold が「構造の整合」を保証するのに対し、  
doc-guard は「内容の整合」を保証する。

本 DSG では以下を明確化する：

- CLI アーキテクチャ  
- LLM 接続アーキテクチャ  
- プロンプト生成と評価  
- 文書モデル（frontmatter と関係性抽出）  
- エラー設計・exit code 設計  
- CI 連携方式  
- セキュリティ方針（API-KEY 等の扱い）

---

## 2. アーキテクチャ構成

doc-guard は既存の構造（cli/core/distribution）と同一パターンを踏襲する。

```
packages/
  cli/
    guard/          # eutelo guard コマンド
  core/
    guard/
      GuardService.ts
      PromptBuilder.ts
      LLMClient.ts
      Analyzer.ts
      IssueFormatter.ts
  distribution/
    prompts/        # （将来的）プロンプトテンプレート
```

### 2.1 CLI レイヤー（packages/cli）

責務：

- 引数パース（`--format=json`, `--fail-on-error`, `--warn-only`）
- 文書パスの受け取り（doc-guard は diff を判断しない）
- GuardService の呼び出し
- exit code のマッピング
- ログ整形（人間向け / CI 向け）

### 2.2 Core レイヤー（packages/core）

#### **GuardService**
doc-guard の中心となるサービス。

責務：

1. 入力された文書パスの読み込み  
2. frontmatter + 本文の抽出  
3. プロンプト生成（PromptBuilder）  
4. LLMClient への問い合わせ  
5. 応答の構造化分析（Analyzer）  
6. IssueFormatter によるレポート生成  
7. CLI に返すための「issues struct」を返却

#### **PromptBuilder**
- 文書の役割（PRD / BEH / DSG / ADR）
- parent・purpose・scope  
- Eutelo の文書規約  
をまとめたプロンプトを生成する。

LLM の差し替えが容易なようテンプレ化。

#### **LLMClient**
- 外部 LLM API へのアクセス抽象化
- 今回の ADR の決定内容を反映（後述）
- エンドポイント / API-KEY / timeout を含む

#### **Analyzer**
- LLM の応答テキストを解析し
  - issue（重大）
  - warning（軽微）
  - suggestion（改善提案）
  に分類する。

#### **IssueFormatter**
- CLI 表示用
- CI JSON 出力用  
の整形を行う。

---

## 3. 文書モデル設計

### 3.1 Document Model

```
type Document {
  path: string
  type: "prd" | "sub-prd" | "beh" | "sub-beh" | "dsg" | "adr" | "task" | "ops"
  id: string
  parent?: string
  feature?: string
  purpose?: string
  content: string (本文)
}
```

### 3.2 frontmatter 解析

ValidationService（doc-scaffold）を再利用する。

- id  
- parent  
- purpose  
- feature  
は guard 側の必須要素。

---

## 4. プロンプト設計

プロンプト構造は以下の3段階で構築：

### 4.1 Base Prompt（文書体系の規則）

- Eutelo 文書体系の原則  
- 各文書の責務（PRD/BEH/DSG/ADR）  
- parent/purpose/scope の定義  

### 4.2 Document Prompt（個別文書内容の注入）

- frontmatter  
- 本文  
- 関連文書とのリンク情報  

### 4.3 Task Prompt（期待結果の要求）

- 矛盾の列挙  
- scope 不足  
- parent の不整合  
- 文書の逸脱  
- 改善提案（suggestion）

---

## 5. フロー

### 5.1 `eutelo guard {FILES...}`

```
入力文書スキャン
    ↓
frontmatter & content 抽出
    ↓
PromptBuilder が LLM プロンプト生成
    ↓
LLMClient が外部 LLM API を呼び出す
    ↓
Analyzer が応答を構造化
    ↓
IssueFormatter が CLI/JSON 形式に整形
    ↓
CLI が exit code 返却
```

### 5.2 exit code 設計

| code | 意味 |
|------|------|
| 0 | 問題なし / warn-only モードで warning のみ |
| 1 | 保留（未使用） |
| 2 | 整合性エラー（重大） |
| 3 | LLM 接続エラー / API設定エラー |

---

## 6. セキュリティ設計

- API-KEY は環境変数のみで取得  
- ログに API-KEY を絶対に出力しない  
- ネットワークエラー時は再試行しない（fail-fast）  
- LLM への送信内容は標準出力に出さない  

---

## 7. 拡張方針

- System prompt / Instruction の可変化  
- モデル選択（gpt-4.1, claude-3, ローカルLLM etc.）  
- 複文書同時解析の高速化  
- Eutelo-docs 全体を対象にした「意味的リンクマップ」生成  
- オフラインチェック機能（embedding + ローカルLLM）

---

## 8. 完了条件（Definition of Done）

- doc-guard が与えられた文書セットに対して構造的に正しく LLM チェックを実行する  
- issue / warning / suggestion を構造化して返却できる  
- CLI と CI の双方で利用可能  
- doc-scaffold で生成された文書と完全互換  
- BEH / PRD / ADR と整合性が取れている  

---