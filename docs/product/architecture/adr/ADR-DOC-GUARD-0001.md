---
id: ADR-DOC-GUARD-0001
type: adr
feature: doc-guard
title: LLM 接続方式・API クライアント方式の選定
status: accepted
version: 1.0
date: 2025-11-14
owners: ["@AkhrHysd"]
---

# ADR-DOC-GUARD-0001  
Document Guard における LLM 接続方式と API クライアント選定

---

## 1. 背景

Document Guard の目的は `eutelo-docs/` 内の文書整合性を外部 LLM により検証することである。  
そのためには、CLI および CI から安定して呼び出せる **汎用 LLM API 接続方式** が必要である。

Eutelo 自体は特定プロバイダに依存しない設計思想であるため、  
API 接続方式も「抽象化された LLM クライアント」を採用する必要がある。

---

## 2. 選択肢

### A. OpenAI API 固定（/v1/chat/completions）
- Pros  
  - 安定性、高品質  
  - 既存ライブラリが豊富  
- Cons  
  - 将来プロバイダ変更が難しい  
  - Local LLM や Anthropic 等と互換性がない

---

### B. OpenAI Compatible Protocol（OpenAI Style API）
- Pros  
  - Anthropic, Groq, Gemini, LlamaEdge, LM Studio など多数が互換  
  - 1つの API クライアントでほとんどの LLM を利用可能  
  - ユーザー側のモデル指定を自由化できる  
- Cons  
  - provider ごとに behavior 差異あり

---

### C. HTTP POST の完全手書き（抽象レイヤーのみ）
- Pros  
  - 最も柔軟  
  - どの API でも利用できる  
- Cons  
  - 再利用性が低い  
  - 型定義・エラーハンドリングが煩雑  
  - メンテナンスコスト大

---

## 3. 決定（Decision）

### **→ B. 「OpenAI Compatible Protocol」を採用する**

理由：

1. **最も LLM の将来互換性が高い**  
2. Anthropic / Groq / OpenRouter / LM Studio / ollama など大半が互換  
3. CLI ユーザーの API endpoint と API-KEY を自由に差し替え可能  
4. Eutelo の「特定プロバイダロックインを避ける」方針と一致  
5. Local LLM（特に企業利用）への展開も容易

---

## 4. 接続方式の実装方針

### 4.1 API-KEY と endpoint

- endpoint: `EUTELO_GUARD_API_ENDPOINT`  
- api-key: `EUTELO_GUARD_API_KEY`  
- model: `EUTELO_GUARD_MODEL`（デフォルトは gpt-4.1-mini 相当）

CLI・CI の双方で環境変数から取得する。

---

### 4.2 LLMClient の抽象インターフェイス

```
interface LLMClient {
  generate(params: {
    prompt: string;
    model: string;
    temperature?: number;
    systemPrompt?: string;
  }): Promise<{ content: string }>
}
```

### 4.3 デフォルト実装

```
class OpenAICompatibleLLMClient implements LLMClient {
  constructor({ endpoint, apiKey }) {...}
  generate(...) {
    POST { endpoint }/v1/chat/completions
  }
}
```

将来的に以下を差し替え可能：

- `AnthropicLLMClient`
- `OllamaLLMClient`
- `LocalLLMClient`
- `GroqLLMClient`

---

## 5. セキュリティ

- API-KEY は環境変数 **のみ**  
- CLI には絶対に出力しない  
- timeout と retries は CLI で管理  
- 送信する文書は最小限（frontmatter + 抽出本文）

---

## 6. 影響（Consequences）

### Positive

- 長期的な LLM の変化に対して耐性が高い  
- ユーザーは任意の LLM 環境を利用可能（ローカル含む）  
- CI での実行が容易  
- 企業利用でも制限が少ない

### Negative

- provider ごとの返答フォーマット差異は Analyzer 側で吸収が必要  
- 同一 prompts でもモデル間で違う結果が出る

---

## 7. 結論

Document Guard の LLM 接続方式は  
**OpenAI 互換 API を用いた抽象化クライアント** を正式採用する。

これにより、プロバイダに依存せず、CI と CLI の両方で安定した整合性チェックを提供できる。

---

追加分

Document Guard における LLM 接続方式・プロンプト方式・diff扱い・外部CLIツール利用に関するアーキテクチャ決定（最終版）

---

## 1. 背景

Document Guard（doc-guard）は、`eutelo-docs/` に格納された  
PRD / BEH / DSG / ADR 等のドキュメント内容について、  
Eutelo が定義する文書体系（purpose / parent / scope / 文書間の関係）に  
**整合しているかを LLM によって検証する機能** である。

doc-scaffold が「ドキュメント構造の保証」を担うのに対し、  
doc-guard は **“内容” の整合性・一貫性を保証する層** として設計されている。

このため、LLM との接続・プロンプト構築・解析・エラー処理について  
堅牢かつ将来拡張性のある基盤が必要となる。

本 ADR では、以下の全てについて最終決定を行う：

- LLM 接続方式（API 規格・抽象化レイヤ）
- model / API endpoint / KEY 取得方式
- diff の扱いとフォーカス方式（全文か、部分か）
- 外部CLIツール（CursorCLI / ClaudeCode / CodexCLI）の利用可否
- guard の責務と呼び出し元（CI）との責務境界

---

## 2. 解決すべき問題

Document Guard が抱える要件は複合的である。

1. **LLM へのドキュメント送信方式**  
   - 全文を送るか  
   - diff（変更行）を送るか  
   - 全文＋diff フォーカスにするか

2. **LLM 接続方式の標準化**  
   - 特定の API に依存しない  
   - 企業環境・ローカルLLMへの対応  
   - CI での安定性

3. **外部CLIツール（CursorCLI 等）利用の必要性・妥当性**

4. **CI で guard を実行する際の責務分離**  
   - diff の判定を guard がやるのか  
   - CI 側がやるのか

これを体系的に整理して決定する。

---

## 3. 議論: 送信するドキュメント（全文 vs diff）

### 3.1 diff だけを送る案（Rejected）

**内容整合性チェック** という doc-guard の核心目的に対し、  
diff のみでは判断できる情報が不足する。

問題点：

- PRD ↔ BEH ↔ DSG ↔ ADR の整合性判断には  
  **文書全体の意味構造が必要**
- 1行変更だけでは purpose/scope の矛盾を正確に検出できない
- 元々ズレている文書群の「歪み」を拾えない

**→ diff-only は採用しない（v1/v2 ともに不適）**

---

### 3.2 全文のみを送る案（採用）

メリット：

- 整合性の判断に必要な全コンテキストが得られる
- プロンプト構築が安定し、モデルを変更しても壊れない
- ガイドラインに忠実に評価可能（purpose / parent / scope）

デメリット：

- トークン消費は大きめ  
  → ただし realistic な範囲内
- 文書が異様に長い場合は扱いが難しくなる  
  → Eutelo 文書体系は構造的に短文であるため許容範囲

**→ doc-guard v1 の正式仕様として採用**

---

### 3.3 全文＋ diff フォーカス案（将来拡張）

これは非常に相性が良く、v2 で導入可能な方式。

方式：

- guard は全文を LLM に送信
- その上で「変更部分」の diff を PromptBuilder が抽出し  
  **“特にこの部分を中心に評価してほしい”** と LLM に伝える
- diff の判別は guard ではなく **CI / 呼び出し元** が行う

メリット：

- 文書全体の整合性チェックを維持しつつ  
- LLM が変更点にフォーカスできるため精度向上
- guard のインターフェイス（doc paths）を崩さない

デメリット：

- プロンプト設計が少し複雑になるのみ

**→ 将来バージョン（v2）で採用候補として記録しておく**

---

## 4. 議論: 外部 CLI LLM ツールの利用（CursorCLI / ClaudeCode / CodexCLI 等）

### 4.1 利用方式のイメージ

doc-guard が内部で：

```
cursor-cli ask < prompt.txt
claude code --prompt prompt.md
codex run < prompt
ollama run llama3 --input prompt.txt
```

などを実行する方式。

### 4.2 メリット

- ローカルLLMが使えて費用が激減する  
- ユーザー環境における Cursor / Claude のワークフロー統合が容易  
- 「プロンプトを CLI にそのまま投げる」という透明性が高い  
- API-KEY 管理不要のケースがある

### 4.3 デメリット（重大）

- **再現性が低く、CI で安定して実行できない**  
  - 環境差異、バージョン差異が極めて大きい
- **統一された JSON 出力を得られない**  
  - doc-guard は issue を構造的に返す必要がある  
- **CLI ツールの出力仕様は変更が多い**  
  → 長期運用に不向き
- **CI/CD 環境にツールをインストールする必要がある**  
  → トラブルポイントが増える
- **doc-guard の責務（抽象LLMClient）と相性が悪い**

### 4.4 結論（Not adopted, but recorded）

- **v1 での採用はしない**
- ただし将来、  
  `ExternalCommandLLMClient`  
  のような backend 実装としてオプション統合する可能性は残す

サポートは可能だが、コア基盤としては不適切と判断する。

---

## 5. 議論: LLM 接続方式（API）

### 選択肢

- OpenAI API 固定
- OpenAI Compatible Protocol（互換API）
- 完全自前HTTP

### 結論

**→ v1/v1.3 の正式採用方式は「OpenAI Compatible Protocol」。**

理由：

- もっとも vendor ロックインを避けられる  
- Groq, Anthropic, OpenRouter, LM Studio, ollama など多数と互換  
- 企業利用でローカルLLMも使いやすい  
- Eutelo の中核原則（vendor neutrality）に合致  
- エンドポイントとモデルは環境変数で自由に切り替えられる

---

## 6. 最終決定（Summary）

### ✔ doc-guard v1（本ADRで採用）
1. **全文を送る方式を採用する**  
2. **LLM 接続は OpenAI Compatible API の抽象化レイヤで統一**  
3. **外部CLIは採用しない**（将来拡張として記録のみ）  
4. **diff は guard の責務ではない**  
   - CI が「どのファイルをガードに渡すか」を決定する  
   - guard は「渡された文書セット」に対して LLM 評価のみ実行する

### ✔ 将来拡張（v2以降）
1. **全文＋diff フォーカス方式を導入可能**  
   - PromptBuilder が diff 情報をプロンプト内に組み込む  
   - guard のインターフェイスは変更しない（doc paths のまま）

2. **ExternalCommandLLMClient（外部CLIバックエンド）を検討可能**  
   - CI の再現性が担保される前提で採用（現在は不可能）

---

## 7. 影響（Consequence）

### Positive
- LLM backend を自由に差し替えられる  
- CI に完全適合し、再現性の高い挙動を提供できる  
- 文書体系の整合性チェックに必要なコンテキストを確保できる  
- 将来の diff フォーカスや CLI backend への拡張が可能

### Negative
- 文書全体を送るためトークン消費は増える  
- Abstract LLMClient の実装コストは若干増える  
- diff フォーカス実装時は PromptBuilder がやや複雑になる

---

## 8. 最終結論（Final Decision）

Document Guard は。

- **OpenAI Compatible API を用いた抽象 LLMClient を正式採用**  
- **文書は常に全文を LLM に送る方式を v1 の正解とする**  
- **diff は guard の責務ではなく、入力選別は呼び出し元（CI）が行う**  
- **全文＋diff フォーカス方式は v2 で採用候補として継続検討**  
- **CursorCLI / ClaudeCode / CodexCLI 等の外部ツールは採用しないが、将来の backend 候補としてADRに記録しておく**

これにより、Eutelo の文書体系の「構造」と「内容」の双方を  
安定かつ長期的に保証する基盤が成立する。

---