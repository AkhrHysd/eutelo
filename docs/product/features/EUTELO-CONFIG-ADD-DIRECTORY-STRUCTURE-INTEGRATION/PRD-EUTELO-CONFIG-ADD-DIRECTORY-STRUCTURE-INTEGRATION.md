---
id: PRD-EUTELO-CONFIG-ADD-DIRECTORY-STRUCTURE-INTEGRATION
type: prd
title: directoryStructure への統一と scaffold 非推奨化
purpose: >
  directoryStructure を scaffold の代替として機能させ、設定を一元化する。
  scaffold は非推奨とし、将来的に削除する。
status: draft
version: 0.2
owners: ["@team-eutelo"]
related: [PRD-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE]
created: "2025-12-05"
last_updated: "2025-12-05"
---

# PRD-EUTELO-CONFIG-ADD-DIRECTORY-STRUCTURE-INTEGRATION
directoryStructure への統一と scaffold 非推奨化

---

## Background

### 現状の問題

Eutelo の設定には2つの重複した概念が存在する：

| 設定 | 用途 | 問題 |
|------|------|------|
| `scaffold` | `eutelo add` でドキュメント生成 | 冗長な設定形式 |
| `directoryStructure` | `eutelo init` でディレクトリ作成 | `add` で使えない |

ユーザーが `directoryStructure` でディレクトリ構造とファイル定義をカスタマイズしても、`eutelo add` コマンドでは反映されない。

### 目標

**`directoryStructure` に設定を統一**し、Single Source of Truth を実現する。

---

## Goals

1. `directoryStructure` のファイル定義で `eutelo add` を動作させる
2. `scaffold` 設定を**非推奨化**（deprecate）
3. preset-default を `directoryStructure` 形式に移行
4. 将来的に `scaffold` を削除（破壊的変更として許容）

---

## Non-Goals

1. `scaffold` の段階的な移行支援ツールの提供（ドキュメントで対応）
2. `scaffold` と `directoryStructure` の長期共存

---

## User Stories

### US1: directoryStructure でドキュメント追加

**As a** Eutelo ユーザー  
**I want** `directoryStructure` で定義したファイルを `eutelo add` で生成したい  
**So that** 設定を一箇所で管理でき、一貫性を保てる

**Acceptance Criteria:**
- `directoryStructure` にファイル定義がある場合、`eutelo add` でドキュメントを生成できる
- `eutelo add prd AAA` で設定に従ったパスにファイルが作成される

### US2: preset-default が directoryStructure を使用

**As a** 新規ユーザー  
**I want** preset-default が `directoryStructure` 形式で提供されてほしい  
**So that** 最新の設定形式で始められる

**Acceptance Criteria:**
- `@eutelo/preset-default` が `directoryStructure` で定義されている
- 既存のドキュメントタイプ（prd, beh, dsg, adr, task, ops）がすべて使用可能

---

## Proposed Solution

### DirectoryFileDefinition の拡張

`directoryStructure` のファイル定義に `kind` と `frontmatterDefaults` を追加し、`scaffold` の機能を完全にカバーする。

```typescript
export interface DirectoryFileDefinition {
  file: string;                    // ファイル名: "PRD-{FEATURE}.md"
  template?: string;               // テンプレートパス
  kind?: string;                   // ドキュメント種別: "prd" (追加)
  description?: string;            // 説明
  prefix?: string;                 // プレフィックス: "PRD-"
  variables?: string[];            // 変数: ["FEATURE"]
  tags?: string[];                 // タグ
  frontmatterDefaults?: {          // フロントマターデフォルト値 (追加)
    type: string;
    parent: string;
  };
}
```

### 設定例

```json
{
  "docsRoot": "docs",
  "directoryStructure": {
    "product/features/{FEATURE}": [
      {
        "file": "PRD-{FEATURE}.md",
        "kind": "prd",
        "template": "templates/prd.md",
        "prefix": "PRD-",
        "variables": ["FEATURE"],
        "frontmatterDefaults": {
          "type": "prd",
          "parent": "/"
        }
      },
      {
        "file": "BEH-{FEATURE}.md",
        "kind": "beh",
        "template": "templates/beh.md",
        "prefix": "BEH-",
        "variables": ["FEATURE"],
        "frontmatterDefaults": {
          "type": "behavior",
          "parent": "PRD-{FEATURE}"
        }
      }
    ],
    "architecture/design/{FEATURE}": [
      {
        "file": "DSG-{FEATURE}.md",
        "kind": "dsg",
        "template": "templates/dsg.md",
        "prefix": "DSG-",
        "variables": ["FEATURE"],
        "frontmatterDefaults": {
          "type": "design",
          "parent": "PRD-{FEATURE}"
        }
      }
    ],
    "architecture/adr": [
      {
        "file": "ADR-{FEATURE}-{SEQUENCE}.md",
        "kind": "adr",
        "template": "templates/adr.md",
        "prefix": "ADR-",
        "variables": ["FEATURE", "SEQUENCE"],
        "frontmatterDefaults": {
          "type": "adr",
          "parent": "PRD-{FEATURE}"
        }
      }
    ],
    "tasks": [
      {
        "file": "TASK-{NAME}.md",
        "kind": "task",
        "template": "templates/task.md",
        "prefix": "TASK-",
        "variables": ["NAME"],
        "frontmatterDefaults": {
          "type": "task",
          "parent": "/"
        }
      }
    ],
    "ops": [
      {
        "file": "OPS-{NAME}.md",
        "kind": "ops",
        "template": "templates/ops.md",
        "prefix": "OPS-",
        "variables": ["NAME"],
        "frontmatterDefaults": {
          "type": "ops",
          "parent": "/"
        }
      }
    ]
  }
}
```

---

## Technical Approach

### 1. DirectoryFileDefinition から ScaffoldTemplateConfig への内部変換

設定読み込み時に `directoryStructure` を内部的に `scaffold` 形式に変換する。これにより `AddDocumentService` の変更を最小限に抑える。

```typescript
function convertToScaffold(
  dirPath: string,
  fileDef: DirectoryFileDefinition,
  docsRoot: string
): ScaffoldTemplateConfig {
  const kind = fileDef.kind ?? inferKindFromFileDef(fileDef);
  const id = `${kind}.${dirPath.replace(/[\/{}]/g, '-')}`;
  
  return {
    id,
    kind,
    path: `${dirPath}/${fileDef.file}`,
    template: fileDef.template ?? `templates/${kind}.md`,
    variables: buildVariablesMap(fileDef),
    frontmatterDefaults: fileDef.frontmatterDefaults
  };
}
```

### 2. kind の推定ロジック

`kind` が明示されていない場合の推定：

```typescript
function inferKindFromFileDef(fileDef: DirectoryFileDefinition): string {
  // 1. prefix から推定 (PRD- → prd)
  if (fileDef.prefix) {
    return fileDef.prefix.replace(/-$/, '').toLowerCase();
  }
  
  // 2. ファイル名から推定 (PRD-{FEATURE}.md → prd)
  const match = fileDef.file.match(/^([A-Z]+)-/);
  if (match) {
    return match[1].toLowerCase();
  }
  
  return 'doc';
}
```

### 3. 設定マージの優先順位

```
directoryStructure (ユーザー設定)
    ↓ 変換
内部 scaffold
    ↓ マージ（directoryStructure が優先）
scaffold (非推奨・後方互換用)
    ↓
最終的な scaffold 設定
```

### 4. preset-default の移行

`@eutelo/preset-default` を `directoryStructure` 形式に書き換える。

---

## Migration Path

### Phase 1: 機能実装（今回）

1. `DirectoryFileDefinition` に `kind`, `frontmatterDefaults` を追加
2. `directoryStructure` → `scaffold` 変換ロジックを実装
3. `AddDocumentService` が変換後の設定を使用

### Phase 2: preset-default 移行

1. `@eutelo/preset-default` を `directoryStructure` 形式に書き換え
2. `scaffold` 設定を削除

### Phase 3: scaffold 非推奨化

1. `scaffold` 使用時に警告を出力
2. ドキュメントで移行方法を案内

### Phase 4: scaffold 削除（破壊的変更）

1. `scaffold` 設定のサポートを削除
2. メジャーバージョンアップ

---

## Acceptance Criteria

- [ ] `DirectoryFileDefinition` に `kind`, `frontmatterDefaults` が追加されている
- [ ] `directoryStructure` のファイル定義から `eutelo add` でドキュメントを生成できる
- [ ] `eutelo add <kind> <feature>` で適切なパスにファイルが作成される
- [ ] 指定されたテンプレートとフロントマターデフォルトが使用される
- [ ] `@eutelo/preset-default` が `directoryStructure` 形式で定義されている
- [ ] 単体テスト・E2Eテストが追加されている

---

## Breaking Changes

以下の破壊的変更を許容する：

1. **scaffold 設定の削除**: Phase 4 で `scaffold` 設定のサポートを終了
2. **preset-default の変更**: `directoryStructure` 形式への移行

---

## Related Documents

- [PRD-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE](../EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE/PRD-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE.md)
- [DSG-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE](../../architecture/design/EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE/DSG-EUTELO-CONFIG-INIT-DIRECTORY-STRUCTURE.md)
