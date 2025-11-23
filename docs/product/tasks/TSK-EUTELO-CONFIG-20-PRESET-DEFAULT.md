---
id: TSK-EUTELO-CONFIG-20-PRESET-DEFAULT
type: task
feature: EUTELO-CONFIGURABLE-FRAMEWORK
title: preset-default パッケージ作成と現行仕様の移管
purpose: >
  既存の Dento/Eutelo 固有仕様を @eutelo/preset-default に退避し、
  コアから完全に切り離す。
status: red
version: 0.1.1
owners: ["@team-eutelo"]
related: [PRD-EUTELO-CONFIGURABLE-FRAMEWORK, DSG-EUTELO-CONFIGURABLE-FRAMEWORK]
due: ""
estimate:
  ideal_days: 4
  realistic_days: 6
  pessimistic_days: 9
last_updated: "2025-11-22"
---

# TSK-EUTELO-CONFIG-20-PRESET-DEFAULT

## Target BEH Scenarios
- BEH IDs: PRESET-DEFAULT-S1〜S5
- 観察ポイント: 全機能がコアではなく preset-default に依存する状態

## TDD Plan
### Red
- [ ] preset-default 未導入状態で全機能が壊れるテストを書く
- [ ] コア内部に残ったハードコーディングが検出されるテストを書く

### Green
- [ ] preset-default パッケージを実装
- [ ] 全テンプレート、全 frontmatter schema、全 LLM プロンプトを移行
- [ ] コアを設定依存に全面変更

### Refactor
- [ ] preset-default の構造整理（templates/prompts/schemas 配下）
- [ ] コア側からデッドコード除去

## Acceptance Criteria
- [ ] コア側には「世界観」を示す値が一切残っていない
- [ ] preset-default を外すとエラーになるが、preset-default を入れれば動く

## DoD
- [ ] `packages/preset-default/` が存在し npm publish 可能
- [ ] CI 上でも preset による動作が安定

## Risks / Dependencies
- リスク：移行漏れによって異常挙動
- 依存：TSK-EUTELO-CONFIG-10-RESOLVER

## Notes
- ここが「分離成功の成否」が決まる最重要フェーズ
- DocumentType の union（`packages/core/src/services/AddDocumentService.ts:19`）は現状デフォルト種別のみを型安全に表現している暫定措置。将来的にユーザー定義種別を許容する必要があり、別途起票した `PRD-EUTELO-CONFIG-DOC-TYPES` で要件を管理する。

## Progress 2025-11-22
- TSK-EUTELO-CONFIG-10-RESOLVER 完了により `EuteloConfigResolved` と CLI 側の `--config` 連携が整備済み。preset-default は Resolver から `presets` 経由で読み込める前提ができた。
- `packages/preset-default` 配下に templates/prompts/schemas を作成し、既存テンプレート（_template-prd/beh/...）を複製。Guard system prompt と共通 frontmatter schema もファイル化し、`src/index.ts` から `defineConfig` で docsRoot/各 document scaffolding/guard prompt をエクスポートするところまで進捗。
- AddDocumentService を config-driven にリファクタし、CLI から `EuteloConfigResolved.scaffold` を渡すことでテンプレート/ID/PARENT を preset 側から注入。ADR シーケンス計算・テンプレート置換は placeholder ベースに変更し、`EUTELO_DOCS_ROOT`/`EUTELO_TEMPLATE_ROOT` の既存オーバーライドも維持。
- ScaffoldService も preset 由来の PRD scaffold を読み込み、`sync` が config で定義されたパス/template/parent を用いて不足 PRD を生成するよう更新。CLI の init/sync は config から docsRoot/scaffold を渡すようになり、デフォルト preset に依存するため現行 Dento 仕様を保ったまま設定化が進行。
- `@eutelo/preset-default` を Config Resolver のデフォルト preset として常時ロードし、CLI 側では TemplateService を preset テンプレートに向けつつ `EUTELO_TEMPLATE_ROOT` 指定時はファイル名ベースで差し替え可能にした。E2E/ユニットテスト (`npm test`) は新挙動でグリーン。
- ValidationService／doc-lint 系が config から frontmatter schema (必須項目) と naming ルール（scaffold の path パターン）を取り込むように改修。CLI `check` も解決済み config を渡して動作し、PRD/BEH/SUB-PRD/SUB-BEH の命名チェックが preset 側の `scaffold.path` に追従する状態になった。
- GraphService/DocumentScanner を config 駆動に変更。`DocumentScanner` は preset から生成した path matcher / mention pattern / frontmatter allowed fields を使用し、Graph CLI (`build/show/impact/summary`) は解決済み config を渡して動作。これにより Dento 固定のファイル名パターンに依存せず、scaffold で宣言されたレイアウトのみを探索するようになった。
- GuardService/PromptBuilder/DocumentLoader を config 駆動に変更。`guard.prompts` で preset 側が System Prompt・model・temperature を定義でき、CLI `guard` も config 経由で GuardService を生成するようになった。DocumentLoader も scaffold を参照して DocumentType を推測できるため、新種別でも Guard が利用可能。
- preset-default の資産を検証するテストを追加（`ConfigResolver` で guard prompts/rootParentIds を確認、`PromptBuilder` 単体テストでテンプレ差し替え確認、CLI `preset.e2e` で存在しない preset 指定時の失敗パスを担保）。
- Commander 実装上 `--config` 派生ロジックは各コマンドが個別に持っているため、preset-default への置換後も影響範囲を意識する必要がある。

## TODO Sync
- [x] 参考資料（`docs/product/architecture/design/EUTELO-CONFIGURABLE-FRAMEWORK` ほか）を踏まえて Dento 既定値の完全一覧を作り、preset-default に移すべき資産を特定する
- [x] `packages/preset-default` スケルトン（tsconfig/exports/tests）を作成し、Resolver から参照できるよう `package.json` を更新
- [x] core サービス（Scaffold/Add/Validation/Graph/Guard）でハードコードしているテンプレート・スキーマ・プロンプトの読み出しを `EuteloConfigResolved` 経由に置換
- [x] preset-default にテンプレート・frontmatter schema・LLM プロンプトをファイル分割で配置し、単体/統合テストを追加
- [x] preset を外したときの失敗パスおよび導入時の成功パスを E2E テストで担保

### Status Check 2025-11-22 PM
- TODO 1・2（資産棚卸し＋preset スケルトン）が完了。次は config 情報を core へ注入できるようサービス層のリファクタと asset 移行へ着手する。
- 依存タスク（TSK-EUTELO-CONFIG-10-RESOLVER）は完了済みのため、進行をブロックする要因はない。

### ステータス更新（2025-11-22 夜）
- preset パッケージの骨格と資産複製までは完了。AddDocumentService＋CLI の config 化と default preset 自動読み込みが進んだため、Scaffold/Validation/Graph/Guard への適用とテンプレ資産完全移行を次フェーズで実施する。`npm test` で CLI/E2E/ユニット一式が通過。

## 資産棚卸し 2025-11-22
「preset-default に移すべき既定値」を現行実装・ドキュメントから抽出した。

- **Docs ルート & ディレクトリ**: `packages/core/src/constants/docsRoot.ts` で `DEFAULT_DOCS_ROOT = "eutelo-docs"`、`packages/core/src/constants/requiredDirectories.ts` で `product/features`, `architecture/design`, `architecture/adr`, `tasks`, `ops` が固定。
- **Document 定義/正規化**: `packages/core/src/services/AddDocumentService.ts` の `DOCUMENT_DEFINITIONS` / `normalize*`、`ScaffoldService.ts` の init/sync ロジックが PRD/BEH/DSG/ADR/TASK/OPS 固定前提。
- **テンプレート資産**: `packages/distribution/templates/_template-*.md` 群に frontmatter と本文構造がベタ書きされており、親 ID やセクション見出しも preset 側に退避が必要。
- **Frontmatter/Lint Schema**: `packages/core/src/doc-lint/frontmatter-parser.ts` の `DEFAULT_REQUIRED_FIELDS`/`DEFAULT_ALLOWED_FIELDS`、`packages/core/src/services/ValidationService.ts` の `ROOT_PARENT_IDS` / `NAMING_RULES` が Dento 規約になっている。
- **Graph/Guard 振る舞い**: `packages/core/src/graph/DocumentScanner.ts` の `DOCUMENT_NAME_PATTERN` / mention 解析、`packages/core/src/guard/PromptBuilder.ts` の system prompt 日本語テキストが世界観を固定。
- **CLI/E2E テスト資産**: `packages/cli/src/index.ts` のテンプレ探索・ヘルプ文言、`packages/cli/tests/*.test.js` の expected path が全て Dento 既定構造に紐づくため preset-default からの注入が必要。

## preset-default パッケージ骨格案
- `packages/preset-default/package.json`: `"name": "@eutelo/preset-default"`, `type: "module"`, `main: "./dist/index.js"`, `types`, `files` に `dist`, `templates`, `prompts`, `schemas` を含め公開。`exports` で `.` から config を提供。
- `packages/preset-default/tsconfig.json`: `extends ../../tsconfig.base.json`、`rootDir: "src"`, `outDir: "dist"`, `composite: true`。ルート `tsconfig.json` の references に追加。
- `packages/preset-default/src/index.ts`: `defineConfig` を用いて `docsRoot`, `scaffold`, `frontmatter.schemas`, `guard.prompts` を定義。テンプレートファイルへの絶対パス解決ユーティリティ（`const templatesDir = fileURLToPath(new URL('../templates/', import.meta.url))` 等）を持ち、Add/Scaffold/CLI から参照できる形にする。
- `packages/preset-default/templates/*.md`: 既存 `packages/distribution/templates` から移設。CLI 配布用途は preset 経由に一本化し、distribution パッケージからは削除か互換ラッパーに切り替える想定。
- `packages/preset-default/prompts/*.md|.txt`: Guard の system/user prompt をファイル化し、`guard.prompts` から参照。
- `packages/preset-default/schemas/*.json`（もしくは `.ts` export）: frontmatter フィールド定義を JSON/TS で構造化し、ValidationService へ config 経由で伝播させる。
- `packages/preset-default/tests/*.test.ts`: Resolver が preset を読み込めるか、scaffold/add/lint/guard の happy-path を `node --test` で担保する。CLI E2E では preset を明示的に読み込んだ fixture を利用。

- `packages/preset-default/` を追加し、package.json / tsconfig / `src/index.ts` を整備。`@eutelo/core` を依存として追加済み。
- ルート `tsconfig.json` の `references` に preset-default を追加。テンプレート資産（PRD/BEH/DSG/ADR/TASK/OPS/Sub 系）を templates/ にコピーし、Guard system prompt・frontmatter schema をファイル化。
- `src/index.ts` では `defineConfig` を通じて scaffolding テンプレート、docsRoot、frontmatter schema、guard prompt の定義をエクスポート（パス解決ユーティリティ付き）。今後は core サービスからこの設定を読み取るようリファクタする。
- AddDocumentService を placeholder 駆動の DocumentBlueprint へ再実装し、`template`/`variables`/`path` を config から解釈。CLI 側は config load 後に docsRoot/TEMPLATE_ROOT オーバーライドを適用してサービスへ渡す構造に更新。TemplateService は override root（EUTELO_TEMPLATE_ROOT）を持てるよう改善。
- Config Resolver は `@eutelo/preset-default` をデフォルト preset として自動適用し、プロジェクト未導入でも現行 Dento 仕様を維持できる。preset 読み込みはプロジェクトローカル解決に失敗した際、core パッケージ経由のフォールバックを実装。
- ScaffoldService/sync は config の `document.prd` scaffold からパスやテンプレ名を解決し、`npm test` の `ScaffoldService` / CLI `init`/`sync` E2E でも config 振る舞いが確認できる状態になった。
