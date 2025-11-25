---
id: PRD-EUTELO-CONFIG-FRONTMATTER-FIXED-VALUES
type: prd
feature: EUTELO-CONFIG-FRONTMATTER-FIXED-VALUES
title: Eutelo Config Frontmatter Fixed Values 機能 PRD
purpose: >
  フロントマター内で実際には固定値として扱うべき値を抽出し、
  scaffold 設定から自動的に注入する仕組みを提供することで、
  テンプレートの保守性を向上させ、設定ミスを防止する。
status: draft
version: 0.1.0
parent: PRD-EUTELO-CONFIGURABLE-FRAMEWORK
owners: ["@team-eutelo"]
tags: ["config", "frontmatter", "scaffold"]
last_updated: "2025-11-22"
---

# PRD-EUTELO-CONFIG-FRONTMATTER-FIXED-VALUES

## Purpose

設定駆動化の一環として、フロントマター内で実装上必須となる固定値（`type` と `parent`）を抽出し、scaffold 設定から自動的に注入する仕組みを提供する。これにより、Graph作成やValidationなどのコア機能が正常に動作することを保証し、設定ミスを防止する。

---

## Background

現在の実装では、以下の問題が存在している：

1. **実装上必須なフィールドの固定値化**
   - `type` フィールドが各テンプレート内で固定値として記述されている（例: `type: prd`, `type: behavior`）
   - `type` は `GraphNode.type` として必須であり、Graph作成時に使用される
   - `parent` フィールドが各テンプレート内で固定値として記述されている（例: `parent: PRINCIPLE-GLOBAL`, `parent: PRD-{FEATURE}`）
   - `parent` は `GraphNode.parentIds` として必須であり、Graphエッジ作成時に使用される
   - `ValidationService.getDefaultRequiredFields()` で特定のkindに対して `parent` が必須とされている

2. **設定ミスのリスク**
   - `kind` と `type` の不一致（例: `kind: beh` だが `type: behavior`）
   - `parent` の設定忘れや誤設定によるGraph構造の破綻
   - テンプレートを手動で編集する際に、必須フィールドを誤って変更してしまうリスク

3. **保守性の課題**
   - 必須フィールドを変更する場合、すべてのテンプレートファイルを更新する必要がある
   - 新種別を追加する際に、必須フィールドの設定を忘れるリスク

4. **設定駆動化の不徹底**
   - scaffold の `kind` から自動的に決定できる値が、テンプレート内にハードコードされている
   - Configurable Framework のゴール（設定から完全に制御可能）を達成するには、これらの必須フィールドを scaffold 設定から注入する必要がある

---

## Goals / KPI

- フロントマター内の実装上必須な固定値（`type` と `parent`）を scaffold 設定から自動的に注入する仕組みを提供する
- Graph作成やValidationが正常に動作することを保証する
- 設定ミス（`kind` と `type` の不一致、`parent` の設定忘れなど）を防止する
- 新種別を追加する際に、必須フィールドの設定を忘れるリスクを排除する

KPI（例）:
- `type` と `parent` が scaffold 設定から自動注入される
- `kind` と `type` の不一致エラーが検出できる
- `parent` が設定されていない場合にエラーまたは警告を出す
- Graph作成時に必須フィールドが欠落しないことを保証する

---

## Scope

### In Scope

- 実装上必須なフィールド（`type` と `parent`）の抽出と分類
- scaffold 設定に必須フィールドの定義を追加（`frontmatterDefaults.type` と `frontmatterDefaults.parent`）
- AddDocumentService で必須フィールドを自動注入するロジックの実装
- TemplateService で必須フィールドをテンプレート変数として扱う仕組みの実装
- 必須フィールドの検証ロジック（`kind` と `type` の整合性チェック、`parent` の存在チェック）

### Out of Scope

- 非必須フィールド（`tags`, `title`, `status`, `version` など）の自動注入（実装に影響しないため）
- 既存ドキュメントの自動マイグレーション（手動更新を想定）
- GUI での固定値設定管理（今回は CLI/設定ファイル運用）
- 動的な固定値の計算（現時点では静的な値のみ）

---

## Requirements

### Functional (FR)

- **FR-1:** scaffold 設定に `frontmatterDefaults` を定義できること
  - `type` と `parent` の必須フィールドを定義可能
  - テンプレート変数（`{FEATURE}`, `{ID}`, `{PARENT}` など）を使用可能

- **FR-2:** AddDocumentService が scaffold 設定から必須フィールドを自動注入すること
  - テンプレートレンダリング時に、必須フィールドをテンプレート変数として利用可能にする
  - テンプレート内の固定値記述を上書きする

- **FR-3:** `kind` と `type` の整合性チェックが動作すること
  - scaffold 設定の `kind` と `frontmatterDefaults.type` が一致しない場合に警告またはエラーを出す
  - `type` が設定されていない場合にエラーを出す

- **FR-4:** `parent` の存在チェックが動作すること
  - 特定のkind（`prd`, `sub-prd`, `behavior`, `sub-behavior`, `design`, `sub-design`）に対して `parent` が設定されていない場合にエラーを出す（rootParentIds に含まれる場合は除く）
  - それ以外のkindに対して `parent` が設定されていない場合に警告を出す（orphan node回避のため）
  - Graph作成時に `parentIds` が空の場合、orphan nodeとして検出されることを明記する

- **FR-5:** 既存のテンプレート変数（`{ID}`, `{FEATURE}`, `{PARENT}` など）との互換性を維持すること

### Non-Functional (NFR)

- 後方互換性：既存のテンプレートが引き続き動作すること（固定値が注入されない場合でも動作）
- パフォーマンス：固定値の注入によるオーバーヘッドが最小限であること
- 拡張性：新種別を追加する際に、固定値の設定が容易であること

---

## Success Criteria

- scaffold 設定に `frontmatterDefaults.type` と `frontmatterDefaults.parent` を定義し、必須フィールドを自動注入できる
- テンプレート内の `type` と `parent` の固定値記述を削除し、scaffold 設定から注入される値を使用できる
- `kind` と `type` の不一致エラーが検出できる
- 特定のkindに対して `parent` が設定されていない場合にエラーを出す（rootParentIds に含まれる場合は除く）
- それ以外のkindに対して `parent` が設定されていない場合に警告を出す（orphan node回避のため）
- Graph作成時に `type` が欠落しないことを保証する
- `parentIds` が空の場合、orphan nodeとして検出されることを明記する
- 既存のテンプレートが引き続き動作する（後方互換性）

---

## Dependencies / Related

- 親機能: `docs/product/features/EUTELO-CONFIGURABLE-FRAMEWORK/PRD-EUTELO-CONFIGURABLE-FRAMEWORK.md`
- 関連機能: `PRD-EUTELO-CONFIG-DOC-TYPES`（DocumentType 拡張機能）
- 既存タスク: `TSK-EUTELO-CONFIG-20-PRESET-DEFAULT`, `TSK-EUTELO-CONFIG-10-RESOLVER`

---

## Risks / Assumptions

- 既存テンプレートの変更が必要になるリスク → 段階的な移行をサポートする
- 固定値の定義が複雑になるリスク → シンプルな設定形式を提供する
- テンプレート変数の優先順位が不明確になるリスク → 明確な優先順位を定義する

---

## Notes

- 本 PRD は固定値の抽出と再定義を目的とする
- 実装フェーズでは、固定値の抽出結果を詳細に分析し、適切な設定形式を検討する必要がある
- 既存テンプレートの移行は段階的に進めることを想定する

---

## References

- `packages/preset-default/templates/_template-*.md` の固定値記述
- `packages/core/src/services/AddDocumentService.ts` のテンプレートレンダリングロジック
- `packages/core/src/services/TemplateService.ts` の変数注入ロジック
- `docs/architecture/ARCH-HARDCODING-AUDIT.md` のハードコーディング監査結果

---

## Appendix: 実装上必須な固定値の抽出結果

### 1. `type` フィールド（必須）

**実装上の使用箇所**:
- `GraphNode.type`: Graph作成時に必須（`type: DocumentKind`）
- `DocumentScanner.normalizeDocumentType()`: `frontmatter.type` から取得
- `GraphBuilder.build()`: `document.type` を `GraphNode.type` に設定
- `ValidationService`: `type` フィールドを使用してスキーマを判定

| kind | テンプレート内の固定値 | 実装上の期待値 | 備考 |
|------|---------------------|--------------|------|
| `prd` | `type: prd` | `prd` | kind と一致 |
| `beh` | `type: behavior` | `behavior` | kind と不一致（`beh` → `behavior`） |
| `dsg` | `type: design` | `design` | kind と不一致（`dsg` → `design`） |
| `adr` | `type: adr` | `adr` | kind と一致 |
| `task` | `type: task` | `task` | kind と一致 |
| `sub-prd` | `type: prd` | `prd` | 親種別と同じ |
| `sub-beh` | `type: behavior` | `behavior` | 親種別と同じ |

**推奨**: scaffold 設定の `frontmatterDefaults.type` で明示的に定義する。`kind` から自動決定する場合は、マッピングルールを定義する。

### 2. `parent` フィールド（条件付き必須）

**実装上の使用箇所**:
- `GraphNode.parentIds`: Graph作成時に使用（`parentIds: string[]`、空配列でもOK）
- `GraphBuilder.build()`: `document.parentIds` からエッジを作成（空の場合はエッジが作成されない）
- `GraphBuilder.computeIntegrity()`: `parentIds` が空の場合、orphan nodeとして検出される
- `ValidationService.getDefaultRequiredFields()`: 特定のkind（`prd`, `sub-prd`, `behavior`, `sub-behavior`, `design`, `sub-design`）に対して `parent` が必須
- `ValidationService.validateParentReferences()`: 親参照の検証（`parentIds.length === 0` の場合はスキップ）

**注意**: `parentIds` が空でもGraph作成は可能だが、orphan nodeとして検出される。特定のkindに対してはValidation時に必須とされる。

| kind | テンプレート内の固定値 | 実装上の期待値 | Validation必須 | 備考 |
|------|---------------------|--------------|--------------|------|
| `prd` | `parent: PRINCIPLE-GLOBAL` | `PRINCIPLE-GLOBAL` | 必須 | rootParentIds に含まれる |
| `beh` | `parent: PRD-{FEATURE}` | `PRD-{FEATURE}` | 必須 | 親PRDへの参照 |
| `dsg` | `parent: PRD-{FEATURE}` | `PRD-{FEATURE}` | 必須 | 親PRDへの参照 |
| `adr` | `parent: PRD-{FEATURE}` | `PRD-{FEATURE}` | 不要 | Graph作成時は推奨（orphan node回避のため） |
| `task` | なし | 設定不要 | 不要 | Graph作成時は推奨（orphan node回避のため） |
| `sub-prd` | `parent: PRD-{FEATURE}` | `PRD-{FEATURE}` | 必須 | 親PRDへの参照 |
| `sub-beh` | `parent: SUB-PRD-{SUB}` | `SUB-PRD-{SUB}` | 必須 | 親SUB-PRDへの参照 |

**推奨**: scaffold 設定の `frontmatterDefaults.parent` で定義する。テンプレート変数（`{PARENT}`）を使用可能にする。rootParentIds に含まれる場合は設定不要とする。特定のkindに対しては必須、それ以外は推奨。

### 3. 非必須フィールド（実装に影響しない）

以下のフィールドは Graph作成やValidationに必須ではないため、本PRDの対象外とする：

- `tags`: `GraphNode.tags` はオプショナル（空配列でもOK）
- `title`: `GraphNode.title` はオプショナル
- `status`: `GraphNode.status` はオプショナル
- `version`: Graph作成に使用されない
- `owners`: Graph作成に使用されない
- `purpose`: Validationで必須だが、固定値ではない（ユーザー入力）

---

## Appendix: 設定形式の提案

```typescript
interface ScaffoldTemplateConfig {
  id: string;
  kind: DocumentKind;
  path: string;
  template: string;
  variables?: Record<string, string>;
  frontmatterDefaults?: {
    type: string; // 必須: Graph作成時に使用される
    parent?: string; // 条件付き必須: 特定のkind（prd, sub-prd, behavior, sub-behavior, design, sub-design）では必須、それ以外は推奨（orphan node回避のため、rootParentIds に含まれる場合は不要）
  };
}
```

**例**:
```typescript
{
  id: 'document.prd',
  kind: 'prd',
  path: 'product/features/{FEATURE}/PRD-{FEATURE}.md',
  template: templatePath('_template-prd.md'),
  variables: {
    ID: 'PRD-{FEATURE}',
    PARENT: 'PRINCIPLE-GLOBAL'
  },
  frontmatterDefaults: {
    type: 'prd', // kind と同じ値（またはマッピング後の値）
    parent: '{PARENT}' // テンプレート変数を使用可能
  }
}
```

**`kind` と `type` のマッピング例**:
```typescript
// kind から type へのマッピングルール
const KIND_TO_TYPE_MAP: Record<string, string> = {
  'prd': 'prd',
  'beh': 'behavior', // beh → behavior
  'dsg': 'design',   // dsg → design
  'adr': 'adr',
  'task': 'task',
  'sub-prd': 'prd',
  'sub-beh': 'behavior'
};
```

**`parent` の設定例**:
```typescript
// PRD: rootParentIds に含まれるため parent は不要
{
  id: 'document.prd',
  kind: 'prd',
  frontmatterDefaults: {
    type: 'prd'
    // parent は設定不要（PRINCIPLE-GLOBAL は rootParentIds に含まれる）
  }
}

// BEH: 親PRDへの参照が必要
{
  id: 'document.beh',
  kind: 'beh',
  frontmatterDefaults: {
    type: 'behavior',
    parent: 'PRD-{FEATURE}' // テンプレート変数を使用
  }
}
```

