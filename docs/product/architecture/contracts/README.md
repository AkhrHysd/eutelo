# 📄 Architecture / Contracts ガイド

このディレクトリは **複数機能で共有される、あるいは外部公開を前提とする契約定義** のみを管理します。  
各機能に閉じた契約は `product/architecture/design/{FEATURE}/contracts/` 側に置き、  
共通化・公開の要件を満たした時点で **昇格** させます。

---

## 対象と目的

- **対象**：API（OpenAPI）、データスキーマ（JSON Schema）、バリデーション仕様、イベント仕様、公開ドキュメント等  
- **目的**：機能横断の再利用性・互換性を担保し、外部/内部の依存者に安定した契約を提供する

> ローカル契約（機能専用）は `design/{FEATURE}/contracts/`。  
> 本ディレクトリは **共有・公開レイヤー** です。

---

## ディレクトリ構成（正式）

```
docs/
  product/
    architecture/
      contracts/
        README.md                  # ← 本ガイド
        {DOMAIN}/                  # 共有/公開の論理ドメイン単位
          {DOMAIN}-openapi.yaml    # API契約（任意）
          {DOMAIN}-schema.json     # データ契約（任意）
          {DOMAIN}-validation.md   # 検証規約（任意）
          {DOMAIN}-events.md       # イベント契約（任意）
          CHANGELOG.md             # 契約の変更履歴（任意だが推奨）
```

- `{DOMAIN}` 例：`IDENTITY/`, `BILLING/`, `NOTIFICATION/` など
- 1ドメイン＝1つ以上の契約ファイル。細分化が必要ならサブファイル名で表現（例：`user-openapi.yaml`）

---

## 昇格基準（design → architecture）

- 複数の `{FEATURE}` から参照される（機能横断）
- 外部とのインテグレーション公開が必要（パブリックAPI/イベント等）
- 将来的に互換性維持ポリシー（SemVer等）で運用する意思がある
- ADR での判断が記録されている（推奨）

> 昇格時は **参照元DSGからの相対パス/リンクを更新** し、影響範囲を `ADR` または `CHANGELOG.md` に残します。

---

## 命名規約

| 種別 | 規則 | 例 |
|------|------|----|
| ドメイン | `{DOMAIN}/` ディレクトリ | `IDENTITY/` |
| API | `{DOMAIN}-openapi.yaml` | `IDENTITY-openapi.yaml` |
| スキーマ | `{DOMAIN}-schema.json` | `IDENTITY-schema.json` |
| バリデーション | `{DOMAIN}-validation.md` | `IDENTITY-validation.md` |
| イベント | `{DOMAIN}-events.md` | `IDENTITY-events.md` |
| 変更履歴 | `CHANGELOG.md` | `CHANGELOG.md` |

- OpenAPI は **3.1**、JSON Schema は **2020-12** を既定
- Markdown仕様は本文先頭に Frontmatter を任意で付与可（下記）

---

## Frontmatter（Markdown仕様に付与する場合）

```yaml
---
id: CONTRACT-{DOMAIN}-{KIND}
type: contract
domain: {DOMAIN}
related_features: [{FEATURE_A}, {FEATURE_B}]
parent: {ADR-ID?}
purpose: >
  （この契約の目的と適用範囲）
status: {draft|active|deprecated}
version: {VERSION}           # 契約のSemVer
owners: ["@platform-team"]
last_updated: "{DATE}"
---
```

> `.yaml` / `.json` ファイルには Frontmatter は付けません。  
> その場合は同名の `-validation.md` や `CHANGELOG.md` でメタ情報を補完します。

---

## バージョニングと互換性

- 破壊的変更（major）は **告知・移行猶予** を必須化
- 非破壊（minor/patch）は互換性維持を前提
- 各 `{DOMAIN}/CHANGELOG.md` に差分を明記  
- 参照側（DSG/実装）への影響は `ADR` に判断を記録

---

## 運用ルール

- すべての契約変更は Pull Request でレビュー  
- 参照中の `{FEATURE}` と外部利用者への影響評価を記述  
- ローカル契約からの **昇格/降格** は必ず記録（`ADR` または `CHANGELOG.md`）  
- 自動生成（例：OpenAPI生成）を行う場合は **生成元と手順** を README に追記

---

## リレーション（参考）

```mermaid
graph TD
  PRD --> DSG
  DSG -->|共通化の必要| ARCH_CONTRACTS[architecture/contracts]
  DSG -->|限定的| LOCAL_CONTRACTS[design/{FEATURE}/contracts]
  ARCH_CONTRACTS <--> ADR
  ARCH_CONTRACTS --> TASKS
```

> **要点**：  
> - 機能ローカルの契約は `design/{FEATURE}/contracts/`  
> - 共有・公開の契約だけが `architecture/contracts/`  
> - 昇格判断は ADR で透明化し、CHANGELOG で外部にも追跡可能にする