---
id: ADR-0105-PublishingPolicy
type: adr
title: 公開戦略（Publishing Policy）の決定
status: accepted
deciders: ["@team-eutelo-core"]
date: "2025-11-13"
related: [SUB-PRD-EUTELO-CORE-DISTRIBUTION, DSG-EUTELO-CORE-DISTRIBUTION]
purpose: >
  このADRは Eutelo Core Distribution の公開方法と運用方針を定義し、
  「全ての開発者が利用できる公共的パッケージ」としての配布戦略を明確化する。
---

# 公開戦略（Publishing Policy）の決定

## Context
Eutelo Core Distribution は、Euteloプロジェクトだけの内部資産ではなく、  
**あらゆるプロジェクトの開発者・デザイナー・PM に共通の「ドキュメント基盤」を提供するためのパッケージ**である。  
そのため内部専用レジストリではなく、「広くオープンに提供する形」が適切である。

また、公開されたテンプレート類が世に出ていくことで、  
Eutelo の “purpose駆動・構造化ドキュメント” の哲学が自然に拡散し、  
よりよい開発文化をビルトインできるという副次効果も期待される。

## Decision
- **公開レジストリ:** npm Public Registry（`npmjs.org`）を基本とする。  
  - 必要に応じて GitHub Packages をミラーとして利用してよい。

- **公開フロー:**  
  - main ブランチに `version` の差分が存在する場合のみ、CI が自動で `npm publish` を実行する。  
  - 手動リリースは、リポジトリの `package.json` に定義された `release` スクリプトのみを経由して実行する。  
    - 具体的にどのパッケージマネージャー（npm / pnpm / yarn / bun 等）を利用するかは、  
      別途リポジトリ全体の方針として決定する。  
  - すべての公開は provenance（署名）付きとする。

- **パッケージ利用範囲**：  
  - 内部に限定しない  
  - 社外チーム、外部開発者、OSSプロジェクトも利用可能  
  - ライセンスは MIT を基本とする（別途ADRで調整可）

## Consequences
- 外部プロジェクトが容易に Eutelo の構造化ドキュメントを取り込めるため、思想浸透が進む。  
- 公開透明性が高まることで、仕様やドキュメント構造の品質要求レベルが上がる。  
- 一方、公開パッケージは後方互換性の慎重な維持が必須となる。

## Alternatives Considered
- **内部利用に限定（GitHub Packages Only）**  
  → Vision（全ての開発に関わる人へ文書基盤を提供）に反するため却下  
- **非公開の monorepo private package**  
  → 取り込み難易度が高く、外部に提供できないので却下

---