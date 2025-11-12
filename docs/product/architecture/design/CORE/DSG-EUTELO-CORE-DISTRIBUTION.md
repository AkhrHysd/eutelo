---
id: DSG-EUTELO-CORE-DISTRIBUTION
type: dsg
feature: EUTELO-CORE
title: Eutelo Core Distribution 設計ガイド
purpose: >
  Eutelo のドキュメント群および関連ガイドを npm パッケージとして配信するための設計方針を定義する。
status: draft
version: 0.5
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
  eutelo-core-distribution/
  ├─ package.json
  ├─ README.md
  ├─ /templates/
  ├─ /config/
  ├─ /examples/          # 参考のみ（実装外）
  └─ CHANGELOG.md
```

---

## 5. 配信方式
- npm registry に `@eutelo/core-distribution` として公開。  
- 各プロジェクトは devDependency として導入し、`node_modules/@eutelo/core-distribution/` 配下からテンプレートや設定を参照する。  
- 公開は GitHub Actions を用いた署名付きリリースを想定（詳細は ADR-0105 公開戦略 で定義予定）。

---

## 6. バージョニング
| レイヤ | 意味 | トリガ |
|------|------|--------|
| **major** | テンプレート構造・規約の破壊的変更 | 構造再設計 |
| **minor** | 新テンプレートや非破壊的なガイド追加 | 機能拡張 |
| **patch** | 微修正・誤字・構文調整 | 保守更新 |

全変更は `CHANGELOG.md` に記録し、`ADR-0106`（バージョニング運用）で詳細ルールを補足予定。

---

## 7. 依存・ビルド方針
この項は **ADR-0101** および **ADR-0102** の決定内容に従う。

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
- [DIRECTORY_GUIDE.md](../../DIRECTORY_GUIDE.md)