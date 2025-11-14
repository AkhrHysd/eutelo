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