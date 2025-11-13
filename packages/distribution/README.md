# @eutelo/distribution

> **⚠️ WIP (Work In Progress)**  
> このパッケージは現在開発中です。初期リリース準備中。

---

## 目的（Why）

`@eutelo/distribution` は、Eutelo プロジェクトが提唱する **「目的駆動・構造化ドキュメント」** の思想と実践方法を、  
あらゆるプロジェクトの開発者・デザイナー・PM に提供するための npm パッケージです。

### なぜこのパッケージが必要か

- **統一されたドキュメント構造の提供**  
  プロジェクト規模を問わず、PRD・BEH・DSG・ADR・TASK などのドキュメントを一貫した構造で管理できるテンプレートとガイドを提供します。

- **異なるプロジェクト間での一貫性維持**  
  複数のプロジェクトやチーム間で、同じドキュメント規約と命名規則を共有することで、  
  ドキュメントの理解・移行・再利用が容易になります。

- **安全な更新と追跡**  
  SemVer によるバージョニングと CHANGELOG により、  
  外部利用者も安全にアップデートし、変更の影響を把握できます。

- **思想の拡散**  
  Eutelo の "purpose駆動・構造化ドキュメント" の哲学を、  
  より多くの開発文化に自然に取り込めるようにします。

---

## 利用範囲

本パッケージは以下の用途で利用できます：

- Eutelo エコシステム内のプロジェクト
- 外部の開発者・他プロジェクト・OSS プロジェクト
- 構造化ドキュメント体系を導入したい任意のプロジェクト

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

### テンプレートの利用

インストール後、テンプレートファイルをプロジェクトにコピーして使用できます：

```bash
# テンプレートをプロジェクトにコピー
cp node_modules/@eutelo/distribution/templates/_template-prd.md docs/product/features/_template-prd.md
cp node_modules/@eutelo/distribution/templates/_template-beh.md docs/product/features/_template-beh.md
cp node_modules/@eutelo/distribution/templates/_template-dsg.md docs/product/architecture/design/_template-dsg.md
cp node_modules/@eutelo/distribution/templates/_template-adr.md docs/product/architecture/adr/_template-adr.md
cp node_modules/@eutelo/distribution/templates/_template-task.md docs/product/tasks/_template-task.md
```

### 構成ガイドの参照

ディレクトリ構造や命名規約については、`DIRECTORY_GUIDE.md` を参照してください：

```bash
# 構成ガイドを参照
cat node_modules/@eutelo/distribution/config/DIRECTORY_GUIDE.md
```

### 参考例の確認

CI/CD や Scaffold の構成例は `examples/` ディレクトリを参照してください。

詳細な利用方法は [examples/scaffold/README.md](./examples/scaffold/README.md) を参照してください。

---

## 配布内容一覧

本パッケージには以下の内容が含まれています：

### `/templates/` - ドキュメントテンプレート

| ファイル名 | 説明 |
|-----------|------|
| `_template-prd.md` | 機能要件定義書（PRD）のテンプレート |
| `_template-beh.md` | 振る舞い仕様書（BEH）のテンプレート |
| `_template-dsg.md` | 設計仕様書（DSG）のテンプレート |
| `_template-adr.md` | アーキテクチャ決定記録（ADR）のテンプレート |
| `_template-task.md` | タスク計画（TASK）のテンプレート |

### `/config/` - 構成ガイド

| ファイル名 | 説明 |
|-----------|------|
| `DIRECTORY_GUIDE.md` | ドキュメント構造・命名・配置規約のガイド |

### `/examples/` - 参考資料（例示のみ）

| ディレクトリ/ファイル | 説明 |
|----------------------|------|
| `ci/github-actions-workflow-example.yml` | CI/CD ワークフローの例示 |
| `scaffold/README.md` | プロジェクト構成の例示と利用方法 |

> **Note:**  
> `examples/` ディレクトリの内容は参考用であり、実装コードは含まれていません。  
> 実際の CI/CD や scaffold ツールの実装は別途必要です。

---

## バージョニング方針

本パッケージは **Semantic Versioning (SemVer)** に厳密に準拠します。

### バージョン形式

- **MAJOR.MINOR.PATCH** 形式
  - **MAJOR**: 利用者が破壊的影響を受ける変更（構造変更・必須項目の削除など）
  - **MINOR**: 後方互換な拡張（テンプレート追加・ガイド追加）
  - **PATCH**: 誤字修正・小規模整形

### 更新の透明性

- すべての変更は `CHANGELOG.md` に記録されます
- MAJOR 更新時は、理由を ADR とリリースノートに明記します
- 外部利用者が安全にアップデートできるよう、影響範囲を明確にします

詳細は [ADR-0106-VersioningPolicy](../../docs/product/architecture/adr/ADR-0106-VersioningPolicy.md) を参照してください。

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
