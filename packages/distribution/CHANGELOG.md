# 🧾 CHANGELOG

このファイルは、`@eutelo/distribution` パッケージの変更履歴を記録します。

---

## 構成と記法

CHANGELOG は ADR-0106-VersioningPolicy に準拠し、以下の4区分を使用します：

```text
## [version] - YYYY-MM-DD
### Added
- 新しく追加された機能・テンプレート・ガイド
### Changed
- 既存の内容を更新・修正した項目
### Fixed
- 修正した不具合・誤記
### Removed
- 削除した項目
```

**バージョン更新の判断基準：**
- **MAJOR**: 利用者が破壊的影響を受ける変更（構造変更・必須項目の削除など）
- **MINOR**: 後方互換な拡張（テンプレート追加・ガイド追加）
- **PATCH**: 誤字修正・小規模整形

---

## 運用ルール

- **すべてのリリースで更新必須**
- **バージョン表記は SemVer（MAJOR.MINOR.PATCH）**
- **日付はリリース日基準**
- **ADR-0106-VersioningPolicy に準拠**

詳細は [ADR-0106-VersioningPolicy](../../docs/product/architecture/adr/ADR-0106-VersioningPolicy.md) を参照してください。

---

## 変更履歴

## [0.3.0] - 2025-11-24

### Changed
- リリースフローとテンプレート構成の改善

### [0.1.0] - 2025-11-13

#### Added
- パッケージ初期セットアップ
- 基本ディレクトリ構造（templates/, config/, examples/）
- 初期版 README（WIP）
- MIT LICENSE

---

