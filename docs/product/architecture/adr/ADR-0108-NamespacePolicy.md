---
id: ADR-0108-NamespacePolicy
type: adr
title: パッケージ Namespace 方針の決定
status: accepted
deciders: ["@team-eutelo-core"]
date: "2025-11-13"
related: [SUB-PRD-EUTELO-CORE-DISTRIBUTION, DSG-EUTELO-CORE-DISTRIBUTION]
purpose: >
  このADRは Eutelo エコシステムにおける npm パッケージ namespace の統一方針を記録する。
---

# パッケージ Namespace 方針の決定

## Context
Eutelo Core Distribution を含む Eutelo エコシステム全体では、  
文書テンプレート・CI・CLI・MCP サーバーなど複数のパッケージが今後発生する見込みである。

パッケージ数が増える前に、  
**どの namespace の下に配置するか** を統一しておく必要がある。

特に core-distribution は「内部専用パッケージ」ではなく、  
**すべての開発者に提供する公共的な文書基盤パッケージ**であるため、  
namespace の一貫性は重要度が高い。

## Decision
- Eutelo 関連の npm パッケージはすべて、  
  **`@eutelo/` namespace に統一する**。
- 配下に置くパッケージ例（将来含む）：
  - `@eutelo/distribution`  
  - `@eutelo/cli`
  - `@eutelo/actions`
  - `@eutelo/mcp`
  - `@eutelo/lint`
  - `@eutelo/graph`
  - ほか、Eutelo の文書体系をサポートするパッケージ全般

- 名前は「機能名を直接表す」シンプルな構造とする  
  → 例：`@eutelo/core-distribution` ではなく  
  → **`@eutelo/distribution`** を正式採用名とする

## Consequences
- すべてのEuteloツールが「まとまったエコシステム」として認識しやすくなる  
- 外部利用者にとっても、学習コストが低くなる  
- 将来パッケージが増えても namespace が散らからない  
- `@eutelo/distribution` という名称は  
  “このパッケージが基盤の配布レイヤである” ことを自然に示せる

## Alternatives Considered
- **@eutelo-core/namespace を作り分ける案**  
  → パッケージ分断につながり、エコシステムとしての統一感が崩れるため却下  
- **scope を複数に分ける案（@eutelo-docs、@eutelo-ci など）**  
  → 将来的に複雑化しやすく、外部の利用者に対して意味が不透明となるため非採用

---