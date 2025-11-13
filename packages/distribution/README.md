# @eutelo/distribution

> **⚠️ WIP (Work In Progress)**  
> このパッケージは現在開発中です。初期リリース準備中。

---

## 目的（Why）

`@eutelo/distribution` は、Eutelo プロジェクトの標準ドキュメント構造・テンプレート・更新ガイド類を、  
外部プロジェクトでも再利用できるよう **配信（distribution）** するための npm パッケージです。

- 標準ドキュメント（PRD / BEH / DSG / ADR 等）のテンプレートおよび構成ガイドを統一的に配布
- 異なるプロジェクト間でドキュメント規約と命名規則の一貫性を維持
- バージョニングを明確化し、安全に更新・追跡できる仕組みを提供

---

## 利用範囲

本パッケージは以下の用途で利用できます：

- Eutelo エコシステム内のプロジェクト
- 外部の開発者・他プロジェクト・OSS プロジェクト
- 構造化ドキュメント体系を導入したい任意のプロジェクト

---

## 配布物概要

| 種別 | 内容 | 配置場所 |
|------|------|----------|
| **テンプレート** | PRD / BEH / DSG / ADR / TASK などの雛形Markdown | `/templates/` |
| **構成ガイド** | Directory Guide・命名/配置規約 | `/config/` |
| **参考資料（例）** | CIやScaffold構成の例示（実装は他ドキュメントで管理） | `/examples/` |

---

## インストール

```bash
npm install @eutelo/distribution
# または
pnpm add @eutelo/distribution
# または
yarn add @eutelo/distribution
```

> **推奨レジストリ:**  
> 本パッケージは **npm Public Registry** (`https://registry.npmjs.org/`) から配信されます。  
> 必要に応じて GitHub Packages をミラーとして利用することも可能ですが、  
> 基本的には npm public registry からのインストールを推奨します。

---

## 使い方

（準備中：テンプレートとガイドの具体的な利用方法を追記予定）

---

## 対応 Node.js

- **最小サポートバージョン:** Node.js **20.x 以上**
- **根拠:** 長期LTS（2026年4月まで）で安定運用可能、ESM標準対応、標準 `fetch`・`test` API を利用可能

詳細は [ADR-0101-NodeSupportRange](../../docs/product/architecture/adr/ADR-0101-NodeSupportRange.md) を参照してください。

---

## ビルド・依存関係

- **現段階ではビルド不要**  
  本パッケージは静的アセット（Markdown, JSON, YAML 等）を中心としており、  
  ビルドツールは不要です。インストール後、そのままテンプレートやガイドを参照できます。

- **将来的な拡張**  
  CLI ツールや検証スクリプトを含める場合は、その時点でビルド構成を検討します。

詳細は [ADR-0102-BuildBundlerPolicy](../../docs/product/architecture/adr/ADR-0102-BuildBundlerPolicy.md) を参照してください。

---

## 公開戦略

- **公開レジストリ:** npm Public Registry (`https://registry.npmjs.org/`) を基本とします  
  - 必要に応じて GitHub Packages をミラーとして利用することも可能です

- **公開方法:**  
  - すべての公開は **provenance（署名）付き** で行われます  
  - CI による自動公開、または手動リリースのいずれも provenance 署名を必須とします

- **パッケージ利用範囲:**  
  - 内部に限定せず、外部開発者・他プロジェクト・OSS プロジェクトも利用可能です  
  - ライセンスは MIT です

詳細は [ADR-0105-PublishingPolicy](../../docs/product/architecture/adr/ADR-0105-PublishingPolicy.md) を参照してください。

---

## ライセンス

MIT License

---

## 関連ドキュメント

- [DSG-EUTELO-CORE-DISTRIBUTION](../../docs/product/architecture/design/CORE/DSG-EUTELO-CORE-DISTRIBUTION.md)
- [ADR-0101-NodeSupportRange](../../docs/product/architecture/adr/ADR-0101-NodeSupportRange.md)
- [ADR-0102-BuildBundlerPolicy](../../docs/product/architecture/adr/ADR-0102-BuildBundlerPolicy.md)
- [ADR-0105-PublishingPolicy](../../docs/product/architecture/adr/ADR-0105-PublishingPolicy.md)
- [ADR-0106-VersioningPolicy](../../docs/product/architecture/adr/ADR-0106-VersioningPolicy.md)
- [ADR-0108-NamespacePolicy](../../docs/product/architecture/adr/ADR-0108-NamespacePolicy.md)

