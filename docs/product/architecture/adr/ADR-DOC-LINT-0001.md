---
id: ADR-DOC-LINT-0001
type: adr
feature: doc-lint
title: Document Lint の統合方式（ESLint / Biome プラグイン方針）の決定
status: accepted
version: 1.0
date: 2025-11-16
owners: ["@AkhrHysd"]
---

# ADR-DOC-LINT-0001
Document Lint の統合方式（ESLint / Biome プラグイン方針）の決定

---

## 1. 背景

Eutelo の doc-lint 機能は、`eutelo-docs/` 配下の Markdown ドキュメントに対して

- frontmatter（id / parent / purpose / type / feature など）
- ディレクトリ構造・ファイル命名規則
- Markdown の基本構造（frontmatter → 本文 / H1 の存在）

といった **静的に決定可能なルール** を検証し、  
開発フロー・CI・エディタ上で違反を早期検出することを目的とする。

このために、doc-lint をどのように各プロジェクトの lint 基盤に統合するか（ESLint / Biome / Remark 等）が重要となる。

---

## 2. 選択肢

### A. 独自 CLI のみ提供する

- `eutelo lint` のみ提供し、linter とは独立して運用する。

**メリット**

- 実装がシンプル
- linter に依存しない

**デメリット**

- 開発者が普段見ている ESLint / Biome の UI に統合されない
- CI 設定が別のステップとして増える
- エディタ統合（VS Code の赤線等）と連携しづらい

---

### B. ESLint プラグインのみ提供する

- Eutelo 用 ESLint プラグインを配布し、TS/JS プロジェクトを対象に統合する。

**メリット**

- JavaScript / TypeScript プロジェクトとの親和性が高い
- 多くのフロントエンドプロジェクトで ESLint が既に使われている
- VS Code がネイティブに ESLint と統合している

**デメリット**

- Biome 採用プロジェクトでは追加で ESLint を入れる必要が出る
- 将来 Biome ベースへ移行する流れに乗り遅れる可能性

---

### C. Biome プラグインのみ提供する

- Biome（高速 linter + formatter）向けのプラグインを提供する。

**メリット**

- 近年のモダンスタックとの相性が良い
- 高速で CI にも向いている

**デメリット**

- 既に ESLint がデファクトなプロジェクトが多く、「Biome だけ」だと採用障壁が高い

---

### D. Core + ESLint / Biome アダプタ（両対応）

- コアの静的解析ロジックを `@eutelo/doc-lint-core` として実装し、
  - ESLint プラグイン
  - Biome プラグイン
  の両方から利用する。

**メリット**

- ESLint 文化のプロジェクトと Biome 文化のプロジェクトの両方をカバーできる
- コアロジックの単一実装（RuleEngine）を保ちつつ、各 linter の API に薄いアダプタを載せるだけで済む
- 将来的に他の linter（Remark 等）を追加するのも容易

**デメリット**

- プラグイン公開・メンテ対象が増える
- 各 linter の API 変更に追随するコストが一定程度発生する

---

## 3. 決定（Decision）

**→ D. Core + ESLint / Biome アダプタ方式を採用する。**

理由：

1. 現実のプロジェクトでは ESLint と Biome が併存している状況が多く、どちらか一方に寄せると採用障壁が高くなる。
2. Core を 1 つにまとめてしまえば、ESLint / Biome それぞれのアダプタは「診断結果を各 linter のフォーマットに変換する」だけの薄い層で済む。
3. 将来的に Remark / Unified / Zed などへの統合を行う場合も、Core を流用できる。
4. doc-lint の UX は「普段使っている linter から自然にエラーが出る」ことが重要であり、そのためには ESLint / Biome 双方への公式対応が望ましい。

---

## 4. 実装方針

### 4.1 Core パッケージ

- 名前（例）: `@eutelo/doc-lint-core`
- 役割:
  - ファイルパスの正規化
  - frontmatter の抽出・パース
  - パス規則からの期待値（type / feature / idPattern）の推定
  - RuleEngine による静的ルール評価
- 出力:
  - `LintResult { errors: LintIssue[], warnings: LintIssue[] }`

```ts
type LintIssue = {
  path: string;
  ruleId: string;
  message: string;
  severity: "error" | "warning";
  loc?: { line: number; column: number };
};
```

### 4.2 ESLint プラグイン

- 名前（例）: `eslint-plugin-eutelo-docs`
- 提供するもの:
  - `plugin:eutelo-docs/recommended` 設定
  - `.md` / `.mdx` ファイル用のルールセット
- 実装方針:
  - ESLint rule 内で `@eutelo/doc-lint-core` を呼び出し、返ってきた `LintIssue[]` を ESLint の `context.report` に変換する。
  - ファイル単位の rule として実装（AST details は最小限に抑える）。

### 4.3 Biome プラグイン

- 名前（例）: `@eutelo/biome-doc-lint`（仮）
- Biome の plugin API に合わせて、`@eutelo/doc-lint-core` の `LintResult` を Biome の診断フォーマットに変換する。
- 設定ファイル（`biome.json` など）から対象パスを `eutelo-docs/**/*.md` に絞る推奨プリセットを提供する。

### 4.4 CLI (`eutelo lint`)

- CLI からも `@eutelo/doc-lint-core` を直接呼び出す薄いラッパとして実装。
- `--format=json` では `LintResult` をそのまま JSON で出力する。

---

## 5. Remark / Unified への対応について

Remark / Unified への対応は **将来拡張としての価値は高い** が、  
v1 の優先順位は ESLint / Biome に劣るため、以下の扱いとする。

- **本 ADR では “検討対象として記録する” に留め、採用はしない。**
- 実装する場合も、`@eutelo/doc-lint-core` を利用する adapter であり、Core 側ロジックは増やさない。

---

## 6. 影響（Consequences）

### Positive

- Core が 1つなので、ルール追加・変更は一箇所で済む。
- ESLint プロジェクト / Biome プロジェクト双方に自然に統合できる。
- エディタ（VS Code / WebStorm など）が提供する lint 統合をフル活用できる。
- CLI での単体実行も同じ Core を使うため、一貫性が高い。

### Negative

- ESLint / Biome 両方の plugin API を追随する必要がある。
- npm パッケージが増え、リリース・バージョニングの運用コストが上がる。

---

## 7. 最終結論

- Document Lint（doc-lint）は **Core + ESLint / Biome のプラグイン構成** を公式アーキテクチャとする。
- Core (`@eutelo/doc-lint-core`) にすべての静的解析ロジック（FrontmatterParser / StructureValidator / RuleEngine）を集約する。
- ESLint プラグイン / Biome プラグイン / CLI は **薄い adapter** として Core を呼び出すだけにする。
- Remark / Unified など他の linter との統合は将来拡張とし、本ADR に「候補として記録」のみ行う。

---