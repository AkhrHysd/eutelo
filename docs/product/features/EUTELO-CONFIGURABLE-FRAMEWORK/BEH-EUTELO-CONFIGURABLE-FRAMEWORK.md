---
id: BEH-EUTELO-CONFIGURABLE-FRAMEWORK
type: beh
feature: EUTELO-CONFIGURABLE-FRAMEWORK
title: Eutelo Configurable Framework BEH
purpose: >
  Eutelo の Configurable Framework 機能について、
  設定駆動・preset 分離・UseCase/Adapter 分離が達成されていることを
  振る舞いレベルで定義する。
status: draft
version: 0.1.0
parent: PRD-EUTELO-CONFIGURABLE-FRAMEWORK
owners: ["@team-eutelo"]
tags: ["config", "preset", "guard", "scaffold"]
last_updated: "2025-11-22"
---

# BEH-EUTELO-CONFIGURABLE-FRAMEWORK

## 1. CONFIG-AUDIT 系（現状棚卸し）

### Scenario CONFIG-AUDIT-S0 — ハードコーディングが検出できる

```gherkin
Scenario: CONFIG-AUDIT-S0 ハードコーディング箇所を機械的に洗い出せる
  Given Eutelo コアの現行ブランチがチェックアウトされている
    And ARCH-HARDCODING-AUDIT.md がまだ存在しない
  When 開発者が "pnpm test config:audit" を実行する
  Then スキャフォールドの固定パス一覧がテスト出力に含まれている
    And frontmatter の固定キー一覧がテスト出力に含まれている
    And Guard 用 LLM プロンプトの固定文字列一覧がテスト出力に含まれている
    And それらの一覧が ARCH-HARDCODING-AUDIT.md に保存されている
```


## 2. CONFIG-RESOLVER 系（Config モデル / Resolver）

### Scenario CONFIG-RESOLVER-S1 — プロジェクトローカルの TS Config が読める

```gherkin
Scenario: CONFIG-RESOLVER-S1 eutelo.config.ts をロードできる
  Given プロジェクトルートに有効な "eutelo.config.ts" が存在する
    And config 内で有効な scaffold, frontmatter, guard が定義されている
  When コアが loadConfig() を呼び出す
  Then TypeScript の config がコンパイル済みの JS として評価される
    And EuteloConfigResolved が返却される
    And 返却された設定の presets 配列が config の宣言通りになっている
```

### Scenario CONFIG-RESOLVER-S2 — preset とローカル設定が正しくマージされる

```gherkin
Scenario: CONFIG-RESOLVER-S2 preset とローカル設定のマージ順が保証される
  Given "@eutelo/preset-default" がインストールされている
    And eutelo.config.ts の presets に "@eutelo/preset-default" が指定されている
    And 同じ scaffold.id を持つ設定が preset とローカルの両方に存在する
  When loadConfig() を呼び出す
  Then EuteloConfigResolved.scaffold の該当 id に対して
       ローカル設定の値が preset の値を上書きしている
    And preset 側の値は fallback としてのみ利用されている
```

### Scenario CONFIG-RESOLVER-S3 — 不正な Config に対して明確なエラーを返す

```gherkin
Scenario: CONFIG-RESOLVER-S3 不正な Config でバリデーションエラーを返せる
  Given eutelo.config.yaml に不正な型（例: enum に number）が含まれている
  When loadConfig() を呼び出す
  Then ConfigValidationError がスローされる
    And エラーメッセージにファイルパスとキー名が含まれている
    And CI 上でも同じエラーメッセージで失敗する
```


## 3. PRESET-DEFAULT 系（デフォルト preset 切り出し）

### Scenario PRESET-DEFAULT-S1 — preset-default を指定すると現行 Dento が動く

```gherkin
Scenario: PRESET-DEFAULT-S1 preset-default で現行 Dento が動作する
  Given "@eutelo/preset-default" がインストールされている
    And eutelo.config.ts の presets に "@eutelo/preset-default" が指定されている
  When Dento リポジトリで "pnpm eutelo scaffold feature AUTH --kind prd" を実行する
  Then 旧実装と同じパスに PRD-AUTH.md が生成される
    And 旧実装と同じ frontmatter が付与されている
```

### Scenario PRESET-DEFAULT-S2 — preset を外すとエラーになる

```gherkin
Scenario: PRESET-DEFAULT-S2 preset を指定しないと scaffold に失敗する
  Given "@eutelo/preset-default" がインストールされていない
    Or eutelo.config.ts の presets に何も指定されていない
  When "pnpm eutelo scaffold feature AUTH --kind prd" を実行する
  Then "scaffold configuration not found" といったエラーが表示される
    And コマンドは非ゼロ終了コードで終了する
```

### Scenario PRESET-DEFAULT-S3 — frontmatter schema が preset によって提供される

```gherkin
Scenario: PRESET-DEFAULT-S3 frontmatter 検証が preset-default から取得される
  Given "@eutelo/preset-default" が frontmatter.schemas を定義している
    And PRD ドキュメントの frontmatter から type フィールドを削除している
  When "pnpm eutelo frontmatter check docs/product/features/AUTH/PRD-AUTH.md" を実行する
  Then "type is required" エラーが出力される
    And エラー定義は preset-default 側の schema に由来している
```

### Scenario PRESET-DEFAULT-S4 — Guard プロンプトが preset から読み込まれる

```gherkin
Scenario: PRESET-DEFAULT-S4 Guard プロンプトを preset から読み込める
  Given "@eutelo/preset-default" の guard.prompts に purposeConsistency が定義されている
    And 対象 PRD ドキュメントが存在する
  When "pnpm eutelo guard docs/product/features/AUTH/PRD-AUTH.md --check purposeConsistency" を実行する
  Then preset-default 配下の purposeConsistency.prompt.md が読み込まれる
    And LLM 呼び出しにその内容が利用される
```

### Scenario PRESET-DEFAULT-S5 — コアに世界観が残っていない

```gherkin
Scenario: PRESET-DEFAULT-S5 コアのソースコードに Dento 固有の値が残っていない
  Given コアのソースコードを全文検索する
  When "docs/product/features" や "PRD-" のような文字列で検索する
  Then それらの文字列が @eutelo/preset-default 以下にしか存在しない
    And コア側には存在しない
```


## 4. USECASE 系（Scaffold / Guard / Frontmatter / Graph）

### Scenario USECASE-S1 — scaffold UseCase が config のみ参照して動く

```gherkin
Scenario: USECASE-S1 scaffold UseCase が設定駆動で動作する
  Given 有効な EuteloConfigResolved が存在する
    And scaffold に feature.prd が定義されている
  When 開発者が API 経由で scaffold({ id: "feature.prd", variables: { FEATURE: "AUTH" } }) を呼び出す
  Then UseCase は config.scaffold["feature.prd"] の path と template を参照する
    And ファイル生成においてハードコーディングされたパスを使用しない
```

### Scenario USECASE-S2 — frontmatter check UseCase が schema ベースで検証する

```gherkin
Scenario: USECASE-S2 frontmatter check が schema ベースで動作する
  Given frontmatter.schemas に kind "prd" の定義が存在する
    And 対象 PRD ドキュメントの type が "beh" に誤設定されている
  When checkFrontmatter({ document }) を呼び出す
  Then "invalid enum value for field type" のエラーが返る
    And 許可されている enum 値は schema から取得されている
```

### Scenario USECASE-S3 — Guard UseCase が prompt 設定に依存して動く

```gherkin
Scenario: USECASE-S3 Guard が GuardPromptConfig に従って動作する
  Given guard.prompts に id "purposeConsistency" の設定が存在する
    And templatePath が有効なプロンプトファイルを指している
  When guard({ document, checkId: "purposeConsistency" }) を呼び出す
  Then UseCase は GuardPromptConfig から model と templatePath を読み込む
    And LLM 入力にはテンプレートに埋め込まれたドキュメント情報が含まれる
    And LLM 出力を CheckResult にマッピングして返却する
```

### Scenario USECASE-S4 — Guard UseCase は prompt 差し替えで挙動が変わる

```gherkin
Scenario: USECASE-S4 Guard の挙動が preset 差し替えで変わる
  Given preset-A と preset-B の両方が guard.prompts.purposeConsistency を定義している
    And プロジェクト config で presets の順番を A→B に設定している
  When guard({ document, checkId: "purposeConsistency" }) を実行する
  Then preset-B の prompt 定義が優先される
    And エラーメッセージの文面が preset-B 側の仕様に従う
```

### Scenario USECASE-S5 — Graph UseCase が relation 定義から依存関係を構築する

```gherkin
Scenario: USECASE-S5 Graph が relation 情報から依存関係を構築する
  Given frontmatter.schemas に parent フィールドが "relation: parent" とマークされている
    And PRD, BEH, DSG の frontmatter に parent が適切に設定されている
  When buildRelationGraph(documents) を呼び出す
  Then Graph ノードが各ドキュメントとして作成される
    And parent フィールドに基づき有向エッジが張られる
    And ルートノードとして VISION / VISION-PRODUCT などが識別される
```

### Scenario USECASE-S6 — Graph UseCase は relation 未定義の kind を無視する

```gherkin
Scenario: USECASE-S6 relation 未定義 kind は Graph から無視される
  Given kind "note" の schema に relation 情報が設定されていない
    And note ドキュメントが多数存在する
  When buildRelationGraph(documents) を呼び出す
  Then kind "note" のドキュメントはノードに含まれない
    Or 含まれてもエッジは張られない
    And Graph の構造は relation 定義を持つ kind だけで構成される
```

### Scenario USECASE-S7 — UseCase は Adapter なしでテスト可能

```gherkin
Scenario: USECASE-S7 UseCase が純粋関数としてテスト可能
  Given モックされた EuteloConfigResolved がテスト内で生成されている
  When scaffold / checkFrontmatter / guard / buildRelationGraph を直接呼び出す
  Then いずれの UseCase もファイルシステムや CLI 引数に依存せずに動作する
    And テストからの差し替えが容易である
```

### Scenario USECASE-S8 — UseCase から preset 名が見えない

```gherkin
Scenario: USECASE-S8 UseCase レイヤから preset 名が透けて見えない
  Given 動作中のコードをロギングしている
  When scaffold / guard などの UseCase が実行される
  Then ログには preset 名やパッケージ名を直接参照する情報が出力されない
    And UseCase はすべて Config 経由で値を受け取っている
```


## 5. CLI-CI 系（Adapter）

### Scenario CLI-CI-S1 — CLI が config → UseCase の単純なラッパーである

```gherkin
Scenario: CLI-CI-S1 CLI が UseCase の薄いアダプタになっている
  Given CLI コマンド "eutelo scaffold" がインストールされている
    And ログレベルを debug に設定している
  When "eutelo scaffold feature AUTH --kind prd" を実行する
  Then CLI はまず loadConfig() を呼び出す
    And 次に scaffold UseCase を 1 回だけ呼び出す
    And それ以外のビジネスロジックを CLI 内に持たない
```

### Scenario CLI-CI-S2 — GitHub Actions が CLI 呼び出しに集約される

```gherkin
Scenario: CLI-CI-S2 CI Action が CLI 呼び出しにのみ依存する
  Given .github/workflows/eutelo-guard.yml が存在する
  When GitHub Actions で workflow が実行される
  Then workflow 内では "eutelo guard ..." コマンドのみが呼ばれる
    And Node.js やライブラリの直接 import は行われない
    And 差分ファイルの検出ロジックは Actions 側にのみ存在する
```

### Scenario CLI-CI-S3 — preset の差し替えで CI の YAML を変えずに済む

```gherkin
Scenario: CLI-CI-S3 preset 差し替え時に CI 設定が不要
  Given プロジェクトで "@eutelo/preset-default" から "@org/preset-enterprise" に切り替える
    And eutelo.config.ts の presets を書き換えた
  When GitHub Actions の eutelo-guard workflow が実行される
  Then CI の YAML を変更しなくても guard の挙動が新しい preset に従って変わる
```


## 6. MIG 系（Migration & Verification）

### Scenario MIG-S1 — Dento での後方互換が確認できる

```gherkin
Scenario: MIG-S1 Dento プロジェクトで後方互換が担保される
  Given Dento プロジェクトに preset-default と eutelo.config.ts が導入されている
  When 既存の "docs/" 配下ドキュメントに対して
       scaffold / frontmatter check / guard / graph を一通り実行する
  Then 旧実装と同じ結果が得られる
    And 差分はログフォーマットやメタ情報に限定されている
```

### Scenario MIG-S2 — 新規プロジェクトで generic preset がそのまま使える

```gherkin
Scenario: MIG-S2 Generic プロジェクトで minimal 導入できる
  Given 新規のミニプロジェクトに "@eutelo/preset-generic" のみを導入している
    And eutelo.config.ts に presets: ["@eutelo/preset-generic"] が設定されている
  When "eutelo scaffold feature AUTH --kind prd" を実行する
  Then generic preset のディレクトリ構成とテンプレートで PRD ファイルが生成される
    And guard / frontmatter check もエラーなく動作する
```

### Scenario MIG-S3 — preset なしの状態では明示的に失敗する

```gherkin
Scenario: MIG-S3 preset 未指定プロジェクトが安全に失敗する
  Given preset を一切導入していない新規プロジェクトがある
    And eutelo.config.* も存在しない
  When "eutelo scaffold feature AUTH --kind prd" を実行する
  Then "no scaffold configuration found" エラーで明示的に失敗する
    And 暗黙のデフォルト動作は行われない
```

### Scenario MIG-S4 — ドキュメント更新が追従している

```gherkin
Scenario: MIG-S4 DirectoryGuide / PRD / DSG が新構成を説明している
  Given docs/ 配下に DirectoryGuide / PRD / DSG が存在している
  When 開発者が Eutelo Configurable Framework の導入方法を読む
  Then presets / eutelo.config.* / CLI / CI の関係が説明されている
    And 旧来のハードコーディング前提の記述は残っていない
```