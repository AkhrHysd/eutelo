---
id: ADR-0102-BuildBundlerPolicy
type: adr
title: ビルドおよびバンドラ方針の決定
status: accepted
deciders: ["@team-eutelo-core"]
date: "2025-11-13"
related: [SUB-PRD-EUTELO-CORE-DISTRIBUTION, DSG-EUTELO-CORE-DISTRIBUTION],
parent: EUTELO-CORE
purpose: >
  このADRは Eutelo Core Distribution におけるビルドおよびバンドラの方針を定義し、
  npm 配信物の構成・依存・成果物形式を統一しない
---

# ビルドおよびバンドラ方針の決定

## Context
Eutelo Core Distribution は Markdown テンプレートや設定ファイルを主に配布する軽量パッケージであり、
アプリケーションロジックを含まない。  
ただし将来的にCLIモジュールや自動検証スクリプトを含める場合、
TypeScript → JavaScript 変換および軽量なバンドル処理が必要となる。

## Decision
- 現行では**ビルドツールを明示的に採用しない**。  
  配布物は静的アセット（Markdown, JSON, YAML 等）を中心とする。  
- 将来的にビルドが必要になった場合の候補として以下を想定する：
  - **tsup**：esbuildベースで設定が少なく、TypeScript→ESM変換を高速に行える。  
  - **Rollup**：ツリーシェイキング性能が高く、依存を最小化できる。  
- 採用判断は将来のCLI機能追加時点で再審査し、専用ADRを起票する。

## Consequences
- 現行段階では追加依存を持たないため、パッケージサイズ・保守性が最小限で済む。  
- 一方、スクリプト導入時にはビルド構成を追加検討する必要がある。  
- 将来的に複数バンドラが候補に挙がった場合、配布対象（Node環境 or Web環境）ごとに分離する。

## Alternatives Considered
- **webpack**：高機能だが設定負荷が大きく、ドキュメント配布には過剰。  
- **Vite**：開発体験は良いが、ブラウザアプリ向けでDistribution用途とは乖離。  
- **tsc 単体**：シンプルだが出力整理・依存解決に追加処理が必要。

---

> **Note:**  
> 本ADRは「現段階でのビルド不要方針」を明示するものであり、  
> 実装段階で変更が生じた場合は supersede する新ADRを起票する。