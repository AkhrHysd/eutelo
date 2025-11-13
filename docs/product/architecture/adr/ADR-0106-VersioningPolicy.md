---
id: ADR-0106-VersioningPolicy
type: adr
title: バージョニング運用の決定
status: accepted
deciders: ["@team-eutelo-core"]
date: "2025-11-13"
related: [SUB-PRD-EUTELO-CORE-DISTRIBUTION, DSG-EUTELO-CORE-DISTRIBUTION]
purpose: >
  このADRは Eutelo Core Distribution を “外部開発者も利用するパブリックな npm パッケージ”
  として安全に配布するためのバージョニング運用を定義する。
---

# バージョニング運用の決定

## Context
Eutelo Core Distribution は内部プロジェクトだけでなく、  
**外部の開発者・他プロジェクト・OSS からも利用されることを前提にした公共的パッケージ**である。

そのため更新ルールは「利用者への影響を明確に伝える」semantic versioning の採用が不可欠である。

## Decision
- **SemVer (MAJOR.MINOR.PATCH)** を厳密に採用する  
  - MAJOR: 利用者が破壊的影響を受ける変更（構造変更・必須項目の削除など）  
  - MINOR: 後方互換な拡張（テンプレ追加・ガイド追加）  
  - PATCH: 誤字修正・小規模整形

- **利用者が外部であることを前提に、以下を徹底する**：
  - MAJOR 更新は release note と ADR に必ず理由を明記  
  - MINOR 更新も CHANGELOG に明確に記録  
  - PATCH もすべて CHANGELOG に残す（透明性確保）

- **影響の見える化**：  
  - CHANGELOG は “Added / Changed / Fixed / Removed” の4区分を使用  
  - ADR のリンクを CHANGELOG に含める  
  - 外部ユーザーが判断しやすいリリースノートを書く

## Consequences
- 公開パッケージであるため後方互換を強く意識した運用になる  
- 変更粒度が厳密になり、透明性を重視した更新ログが必要  
- 利用者が外部であっても安全にアップデート可能

## Alternatives Considered
- **CalVer**：外部ユーザーが「意味的差分」を把握しづらく不適  
- **内部向けの適当な semver**：外部利用を前提にすると不適  
- **バージョン自動インクリメント**：更新理由が外部に伝わらず透明性が損なわれるため不採用

---