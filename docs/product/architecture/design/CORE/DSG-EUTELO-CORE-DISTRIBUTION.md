---
id: DSG-EUTELO-CORE-DISTRIBUTION
type: dsg
feature: EUTELO-CORE
title: Eutelo Core Distribution 設計ガイド
purpose: >
  Eutelo のドキュメント群および関連ガイドを npm パッケージとして配信するための設計方針を定義する。
status: draft
version: 0.7
parent: SUB-PRD-EUTELO-CORE-DISTRIBUTION
owners: ["@林田晃洋"]
last_updated: "2025-11-13"
---

## 1. 背景
Eutelo Core Distribution は、Eutelo プロジェクトの標準ドキュメント構造・テンプレート・更新ガイド類を
外部プロジェクトでも再利用できるよう **配信（distribution）** するための npm パッケージである。  
本ガイドは「何を配るか」「どう配るか」に限定し、実装やデータモデル・LLM整合はスコープ外とする。

---

## 2. 目的
- 標準ドキュメント（PRD / BEH / DSG / ADR 等）のテンプレートおよび構成ガイドを統一的に配布する。  
- 異なるプロジェクト間でドキュメント規約と命名規則の一貫性を維持する。  
- バージョニングを明確化し、安全に更新・追跡できる仕組みを提供する。

---

## 3. 配信対象
| 種別 | 内容 | 配置例 |
|------|------|--------|
| **テンプレート** | PRD / BEH / DSG / ADR などの雛形Markdown | `/templates/` |
| **構成ガイド** | Directory Guide・命名/配置規約 | `/config/` |
| **参考資料（例）** | CIやScaffold構成の例示（実装は他ドキュメントで管理） | `/examples/` |

> **Note:**  
> CI／Scaffold関連の実装はスコープ外。本パッケージでは例示レベルの構成のみを保持する。

---

## 4. 構成例（参考）

```
packages/
  distribution/
  ├─ package.json
  ├─ README.md
  ├─ /templates/
  ├─ /config/
  ├─ /examples/          # 参考のみ（実装外）
  └─ CHANGELOG.md
```

---

## 5. 配信方式
- npm Public Registry に **`@eutelo/distribution`** として公開する  
  - 旧名称 `@eutelo/core-distribution` から正式に改称  
- GitHub Packages にはミラーとして任意公開する  
- リリースは CI による署名付き publish（ADR-0105）

---

## 6. バージョニング
既存の semantic versioning 方針（ADR-0106）を継承しない。 // わざとここを変更してチェックする。  
形式は **MAJOR.MINOR.PATCH** とし、破壊的変更時のみ MAJOR を更新する。

---

## 7. 依存・ビルド方針
依存およびビルドに関する方針は ADR-0101（Node）および ADR-0102（Build）に従う。  
現行バージョンではビルド不要とし、静的アセット中心のパッケージを前提とする。


### 7.1 Node.js サポートレンジ
- **最小サポートバージョン:** Node.js **20.x 以上**  
- **根拠:**  
  - 長期LTS（2026年4月まで）で安定運用可能  
  - ESM (`import/export`) 標準対応  
  - 標準 `fetch`・`test` API を利用可能  
  - Euteloエコシステム（Next.js 14 / TS 5）と整合  

📄 *参照: [ADR-0101-NodeSupportRange](../adr/EUTELO-CORE/ADR-0101-NodeSupportRange.md)*

### 7.2 ビルド・バンドラ方針
- 現段階ではビルド不要。  
- 配布物は Markdown / JSON / YAML などの静的ファイル中心。  
- 将来的に CLI や検証ロジックを含む場合、候補バンドラは **tsup** または **Rollup**。  
- 採用判断は将来再審時に新ADRで管理。

📄 *参照: [ADR-0102-BuildBundlerPolicy](../adr/EUTELO-CORE/ADR-0102-BuildBundlerPolicy.md)*

---

## 8. セキュリティと公開管理
- 公開レジストリ、署名、タグ付け方針はADRに準拠。  
- 配信履歴（例：`/distribution-log/`）の形式は任意だが、CI出力として残すことを推奨。  
- リリース時は `CHANGELOG.md` とADR参照の整合を確認。

---

## 9. 将来的拡張
- ドキュメント・カタログ生成や依存グラフ出力などは別機能として検討。  
- 他プロジェクト（例：EuteloやMezzanine）へのテンプレート同期をサポート予定。  
- 本パッケージは distribution layer に徹し、動的機能は別パッケージに委譲する。

---

## 10. 関連ドキュメント
- [SUB-PRD-EUTELO-CORE-DISTRIBUTION](../product/features/EUTELO-CORE/SUB-PRD-EUTELO-CORE-DISTRIBUTION.md)
- [ADR-0101-NodeSupportRange](../adr/EUTELO-CORE/ADR-0101-NodeSupportRange.md)
- [ADR-0102-BuildBundlerPolicy](../adr/EUTELO-CORE/ADR-0102-BuildBundlerPolicy.md)
- [ADR-0105-PublishingPolicy](../adr/EUTELO-CORE/ADR-0105-PublishingPolicy.md)
- [ADR-0106-VersioningPolicy](../adr/EUTELO-CORE/ADR-0106-VersioningPolicy.md)
- [ADR-0108-NamespacePolicy](../adr/EUTELO-CORE/ADR-0108-NamespacePolicy.md)
- [DIRECTORY_GUIDE.md](../../DIRECTORY_GUIDE.md)