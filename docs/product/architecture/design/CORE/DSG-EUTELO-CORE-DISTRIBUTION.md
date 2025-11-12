# DSG-EUTELO-CORE-DISTRIBUTION
---
id: DSG-EUTELO-CORE-DISTRIBUTION
type: dsg
feature: EUTELO-CORE
title: Eutelo Core Distribution 設計ガイド
purpose: >
  Eutelo のドキュメント群および関連ガイドを npm パッケージとして配信するための設計方針を定義する。
status: draft
version: 0.4
parent: SUB-PRD-EUTELO-CORE-DISTRIBUTION
owners: ["AkhrHysd"]
last_updated: "2025-11-13"
---

## 1. 背景
Eutelo Core Distribution は、Eutelo プロジェクトの標準ドキュメント構造・テンプレート・更新ガイド類を、
外部プロジェクトでも再利用できるよう **配信（distribution）** するための npm パッケージである。
本ガイドは「何を配るか」「どう配るか」に限定する。内部データモデルやLLM整合はスコープ外。

## 2. 目的
- 標準ドキュメント（PRD/BEH/DSG/ADR 等）のテンプレートと構成ガイドの配布。
- 異なるプロジェクト間でドキュメント規約の一貫性を維持。
- 破壊的変更を明確化したバージョニングで安全に更新可能とする。

## 3. 配信対象
| 種別 | 内容 | パッケージ内の配置例 |
|------|------|----------------------|
| ドキュメント・テンプレート | PRD / BEH / DSG / ADR の雛形Markdown | `/templates/` |
| 構成ガイド | Directory Guide・命名/配置規約 | `/config/` |
| 参考資料（例のみ） | CI / Scaffold の**参考**フォルダ（実装は別ドキュメント範囲） | `/examples/` |

> **注**: CIやScaffoldの実装は本DSGのスコープ外。ここでは**参考例としての配置のみ**を許可する。

## 4. 構成例（参考）
```
packages/
  eutelo-core-distribution/
  ├─ package.json
  ├─ README.md
  ├─ /templates/
  ├─ /config/
  ├─ /examples/          # 参考。実装は他ドキュメントに委譲
  └─ CHANGELOG.md
```

## 5. 配信方式
- npm registry に公開（例: `@eutelo/core-distribution`）。
- 利用側は devDependency として導入し、`node_modules/@eutelo/core-distribution/` からテンプレート等を参照。

## 6. バージョニング
| レイヤ | 意味 | トリガ |
|------|------|--------|
| major | テンプレート/配置規約の破壊的変更 | 構造再設計 |
| minor | テンプレ追加/非破壊の規約拡張 | 機能拡張 |
| patch | 誤字・微調整 | 保守 |

全変更は `CHANGELOG.md` に記録。リリース運用詳細はADRで定義する。

## 7. 依存・ビルド
- 最小サポート環境やビルドツールの選定は**本体に含めない**。配信に必要な最小限の出力物のみを公開する。
- 具体的な Node.js 対応バージョン、ビルド/バンドル方針は **別途ADR** により決定・参照（本DSGは結果のみを受け入れる）。

## 8. セキュリティと公開管理
- 公開レジストリ、署名、公開プロセスはADRで定義し、本パッケージのREADMEに要点のみ記載する。
- 公開履歴の記録フォーマット（例：`/distribution-log/`）は任意。採用有無はADRに従う。

## 9. 将来的拡張（情報のみ）
- ドキュメント・カタログの自動生成や可視化は、別機能として検討する（スコープ外）。
- 参照用の外部ツール群（CI/Scaffold等）との連携は「例」に留める。

## 10. 関連ドキュメント
- SUB-PRD-EUTELO-CORE-DISTRIBUTION
- DIRECTORY_GUIDE.md
- （各種ADR：採用技術・リリース運用 ほか）