---
id: ADR-0101-NodeSupportRange
type: adr
title: Node.js サポートレンジの決定
status: accepted
deciders: ["@team-eutelo-core"]
date: "2025-11-13"
related: [SUB-PRD-EUTELO-CORE-DISTRIBUTION, DSG-EUTELO-CORE-DISTRIBUTION]
purpose: >
  このADRは Eutelo Core Distribution における Node.js のサポートレンジを定義し、
  配信対象環境の互換性方針を明確化する。
---

# Node.js サポートレンジの決定

## Context
Eutelo Core Distribution は npm パッケージとして配布されるため、
利用者環境の Node.js バージョン互換性を定める必要がある。  
対象はドキュメントテンプレートと設定ファイルが中心であり、
実行バイナリを伴わない軽量構成を想定している。  
ただし、将来的に CLI スクリプト等を含む場合、
ES Modules サポートと LTS 期間の安定性を両立するバージョン選定が求められる。

## Decision
- 最小サポートレンジを **Node.js 20.x 以上** とする。  
- 理由：
  1. Node.js 20 は 2026年4月までのLTSであり、安定運用期間が十分に長い。  
  2. ESM (`import/export`) が完全サポートされており、CommonJS依存を解消できる。  
  3. 標準 `fetch`・`test` API が利用可能で、外部依存を減らせる。  
  4. Euteloエコシステムが Next.js 14 / TypeScript 5 を前提としているため、整合が取れる。

## Consequences
- Node.js 18以前の環境では一部構文やパッケージ解決でエラーが発生する可能性。  
- LTSサイクルに追随するため、今後は LTSリリースごとに再評価を行う（例：Node 22 時点で再審）。  
- 将来的にCLIツールが導入される場合でも、追加ビルド要件を最小化できる。

## Alternatives Considered
- **Node.js >=18.x**：広範互換だが、`fetch`非標準・ESM挙動差異があり保守コストが増大。  
- **Node.js >=22.x**：将来的には採用余地ありだが、現時点では早期すぎて導入側が追随しにくい。

---

> **Note:**  
> Node.js のサポートレンジはリリースLTSに合わせて定期的に再審査すること。  
> 本ADRは `@team-eutelo-core` によってメンテナンスされる。