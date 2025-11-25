# 🧾 CHANGELOG

このファイルは、`@eutelo/cli` パッケージの変更履歴を記録します。

---

## 変更履歴

## [0.4.0] - 2025-11-25

### Added
- DocumentType拡張機能: Configで定義されたカスタムDocumentTypeが自動的にCLIコマンドとして利用可能になる機能を追加
- カスタムDocumentTypeのサポート: `eutelo.config.*`でscaffoldエントリを定義すると、自動的に`eutelo add <custom-type>`コマンドが生成される

### Changed
- AddDocumentService: Configからscaffoldエントリを検索するように変更し、未登録DocumentTypeに対して`DocumentTypeNotFoundError`をスロー
- CLI: Config解決後にscaffoldエントリから動的にサブコマンドを生成するように変更（既存の固定コマンドとの後方互換性を維持）

