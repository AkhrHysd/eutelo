---
id: ARCH-HARDCODING-AUDIT
type: architecture
title: Eutelo ハードコーディング棚卸し
status: observation
owners: ["@team-eutelo"]
last_updated: "2025-11-22"
---

# ARCH-HARDCODING-AUDIT

> 本ドキュメントは TSK-EUTELO-CONFIG-00-AUDIT の Red フェーズ成果です。  
> 現行 Eutelo コアで Dento 固有の構造／規約に依存している箇所を実装ソースから直接洗い出し、後続の preset/config 切り出し対象を明確化します。

## スコープと調査手順
- 対象: `packages/core`, `packages/cli`, `packages/distribution`, `packages/infrastructure`, および関連ドキュメント / テスト。
- 手法:
  1. `rg "docs/product"` などの文字列検索で固定パス・ID を列挙。
  2. `packages/core/src` 内のサービス／doc-lint／guard／graph各層をファイル単位でレビュー。
  3. CLI・テンプレート・E2E テストを確認し、CI（`npm test`）で必ず走るチェックがどのハードコードに依存しているかを追跡。
- 方針: 実装変更は行わず、観測できた固定構造をカテゴリ別に記録。

## ハードコーディング一覧

### 1. Docs ルートとディレクトリ構造
| 項目 | ソース | 固定内容 |
| --- | --- | --- |
| Docs ルート名 | `packages/core/src/constants/docsRoot.ts` | `DEFAULT_DOCS_ROOT` が `'eutelo-docs'` 固定。環境変数 `EUTELO_DOCS_ROOT` でしか変えられない。 |
| 初期化されるディレクトリ | `packages/core/src/constants/requiredDirectories.ts` | `product/features`, `architecture/design`, `architecture/adr`, `tasks`, `ops` など Dento の階層そのもの。追加／削除は定数リストを書き換えるしかない。 |
| CLI 表記 | `packages/cli/src/index.ts` | `init` コマンド説明が「eutelo-docs structure」を前提にメッセージを固定。 |

### 2. Scaffold / AddDocument サービス
| 項目 | ソース | 固定内容 |
| --- | --- | --- |
| PRD Sync の出力パス | `packages/core/src/services/ScaffoldService.ts` | `docsRoot/product/features/{feature}/PRD-{FEATURE}.md` のみ生成。`PARENT` に常に `PRINCIPLE-GLOBAL` を注入。 |
| テンプレート ID | 同上 | `_template-prd.md` 固定。feature/sub や kind を動的ロードできない。 |
| ドキュメント定義マップ | `packages/core/src/services/AddDocumentService.ts` | PRD/BEH/SUB-PRD/SUB-BEH/DSG/ADR/TASK/OPS の 8 種に限定し、ファイル名・フォルダ・親 ID（例: PRD → `PRINCIPLE-GLOBAL`, BEH → `PRD-{FEATURE}`）がハードコード。 |
| 正規化ルール | 同上 | feature/sub/name を `A-Z0-9-` のみ許容・大文字化する Dento 仕様を固定。 |
| ADR 通番 | 同上 | `ADR-{FEATURE}-{0001}` 形式で 4 桁ゼロ埋め。 |
| Template root 解決 | `packages/cli/src/index.ts` | `@eutelo/distribution/templates` 直下を参照。`eutelo.config` でテンプレ配置を替える術がない（ENV `EUTELO_TEMPLATE_ROOT` のみ）。 |

### 3. テンプレート（Frontmatter / 本文）
| 項目 | ソース | 固定内容 |
| --- | --- | --- |
| PRD frontmatter | `packages/distribution/templates/_template-prd.md` | `title: {FEATURE} 機能 PRD`, `tags: ["{FEATURE}"]`, `parent: {PARENT}`, `owners`, `purpose` の定型文（日本語）。 |
| BEH/DSG/TASK など | `packages/distribution/templates/_template-*.md` | 種別名・日本語セクション見出し（例: `## Goals / KPI`）と emoji 含む記述が固定。Guard プロンプトや CLI メッセージの期待とも整合。 |
| SUB ドキュメント | `_template-sub-prd.md`, `_template-sub-beh.md` | `SUB-PRD-` / `BEH-` 命名や親参照の説明がテンプレ内に組み込み済み。 |

### 4. Frontmatter / 静的解析（doc-lint, validation, loader）
| 項目 | ソース | 固定内容 |
| --- | --- | --- |
| 必須フィールド | `packages/core/src/doc-lint/frontmatter-parser.ts` | `id`, `type`, `feature`, `purpose`, `parent` を必須扱い。kind ごとの可変 schema は持てない。 |
| 許可フィールド | 同上 | `status`, `version`, `owners`, `tags`, `last_updated`, `subfeature` など固定セット。 |
| PATH→Type 推論 | `packages/core/src/doc-lint/structure-analyzer.ts` / `services/ValidationService.ts` | `product/features/**/PRD-*.md` 等の正規表現で種別確定。パス構造を変えると型判定できない。 |
| 命名チェック | `packages/core/src/services/ValidationService.ts` | `NAMING_RULES` が `product/features/{FEATURE}/...` や `architecture/design/{FEATURE}/DSG-...` を直書き。 |
| ルート親 ID | 同上 | `ROOT_PARENT_IDS = {'PRINCIPLE-GLOBAL'}` のみ。 |
| frontmatter 解析 | 同上 / `doc-lint/structure-analyzer.ts` | `resolveParentPath()` が `PRD/BEH/DSG/ADR/TASK/OPS` ID プレフィックスを個別対応。 |
| DocumentLoader 除外規約 | `packages/core/src/guard/DocumentLoader.ts` | README・`_template-*`・`philosophy` 配下を guard 対象から除外。今のディレクトリ命名に依存。 |
| DocumentScanner フィルター | `packages/core/src/graph/DocumentScanner.ts` | `DOCUMENT_NAME_PATTERN` で `PRD|BEH|DSG|ADR|TASK|OPS` などのみ許可。`DEFAULT_ALLOWED_FIELDS` も同ファイル内で固定。 |

### 5. Guard（Prompt / LLM 前提）
| 項目 | ソース | 固定内容 |
| --- | --- | --- |
| System prompt | `packages/core/src/guard/PromptBuilder.ts` | PRD/BEH/DSG/ADR/TASK/OPS 6 種を列挙し、役割・関係性・検出項目（purpose conflict 等）を日本語/英語混在で固定。 |
| 出力スキーマ | 同上 | `issues/warnings/suggestions` JSON 構造を固定し CLI 側も想定（`GuardService` + CLI）。 |
| LLM Env | `packages/core/src/services/GuardService.ts` | `EUTELO_GUARD_API_ENDPOINT`, `EUTELO_GUARD_API_KEY`, `EUTELO_GUARD_MODEL`、および `EUTELO_GUARD_STUB_RESULT` など環境名が固定。 |
| ドキュメント種別推定 | `DocumentLoader.inferDocumentType()` | ファイル名プレフィックス（`PRD-`, `SUB-PRD-`, `BEH-` 等）で type を推測し、`ops` は `_template-ops` という特殊条件あり。 |

### 6. Graph / Relation
| 項目 | ソース | 固定内容 |
| --- | --- | --- |
| 解析対象ファイル | `packages/core/src/graph/DocumentScanner.ts` | Dento の命名パターン以外を完全に無視（`DOCUMENT_NAME_PATTERN`）。 |
| Relation 解釈 | `GraphBuilder` | parent/related/mention の relation タイプが固定。frontmatter の `parent`/`related` がそのまま semantics になる。 |
| メンション検出 | `DocumentScanner` | `MENTION_PATTERN` が `PRD|BEH|DSG|ADR|TASK|TSK|OPS|SUB-PRD|SUB-BEH` 固定。 |
| Impact Analyzer | `packages/core/src/graph/ImpactAnalyzer.ts` | hop 数に応じた優先度（1 hop=must-review 等）を固定、config できない。 |
| GraphSerializer | `GraphSerializer` | Mermaid 出力で node label を `ID (type)` に固定。 |

### 7. CLI / テスト / CI 結合
| 項目 | ソース | 固定内容 |
| --- | --- | --- |
| CLI サブコマンド | `packages/cli/src/index.ts` | `add prd|beh|sub-prd|...` で直接 core document type を指定。config 経由で新種別を追加不可。 |
| Guard CLI | 同上 | `guard` コマンドが `docs/product/features/...` ファイルに対して例示を固定。 |
| テンプレ探索 | 同上 | `EUTELO_TEMPLATE_ROOT` 以外に設定ファイルで切り替える術なし。 |
| E2E テスト | `packages/cli/tests/*.test.js` | `eutelo-docs/product/features/AUTH/PRD-AUTH.md` など具体パスを多数固定。CI で `npm test` すると現構造が期待。 |
| ルールエンジン | `RuleEngine` | CLI `lint` が内部的に `resolveParentPath()` を呼び、親リンク存在確認を docsRoot 下限定で行う。 |

## 所感と Config 化ターゲット
1. **docsRoot/ディレクトリ構造自体を config に切り出す必要**がある。init/sync/add/validation/graph/guard すべてが `product/features` ネストに依存している。
2. **Document type ごとの schema・命名・親子ルール**が複数箇所（AddDocumentService, ValidationService, structure-analyzer, guard loader, graph scanner）に重複し、preset 化の際は単一の DSL/定義元に集約する必要がある。
3. **Guard プロンプトと CLI UX**が現行 PRD/BEH/DSG 用語に直結しており、prompt テンプレも preset から供給する仕組みが不可欠。
4. **CI/E2E**（`node --test` で動く CLI tests）が `eutelo-docs` 配下の具体例を前提としており、設定化後は fixture を config ベースに生成する体制を整えないと後方互換を壊す。

## 次のアクション候補
1. Config/プリセット DSL の叩き台を `packages/distribution/config` 配下で設計し、Add/Scaffold/Validation/Graph/Guard が同一設定を読むよう設計書を更新。
2. Guard プロンプトをファイルテンプレに切り出し、`PromptBuilder` から参照先を差し替えられるようにする。
3. CLI/E2E テストを設定注入前提の fixture（仮想 docsRoot）で動くように整理し、CI が新旧双方を検証できる土台を作る。
