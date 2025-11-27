# 🧾 CHANGELOG

このファイルは、`@eutelo/cli` パッケージの変更履歴を記録します。

---

## 変更履歴

## [0.4.1] - 2025-11-27

### Added
- guard コマンド: 関連ドキュメント自動収集オプションを追加
  - `--with-related`: 関連ドキュメント収集を有効化（デフォルト）
  - `--no-related`: 関連ドキュメント収集を無効化
  - `--depth <n>`: 探索深度を指定（デフォルト: 1）
  - `--all`: 深度に関係なくすべての関連ドキュメントを収集
- `graph related <documentId>` コマンド: 指定したドキュメントの関連ドキュメント一覧を表示
  - `--format <format>`: 出力形式（text または json）
  - `--direction <dir>`: 探索方向（upstream、downstream、both）

## [0.4.0] - 2025-11-25

### Added
- DocumentType拡張機能: Configで定義されたカスタムDocumentTypeが自動的にCLIコマンドとして利用可能になる機能を追加
- カスタムDocumentTypeのサポート: `eutelo.config.*`でscaffoldエントリを定義すると、自動的に`eutelo add <custom-type>`コマンドが生成される

### Changed
- AddDocumentService: Configからscaffoldエントリを検索するように変更し、未登録DocumentTypeに対して`DocumentTypeNotFoundError`をスロー
- CLI: Config解決後にscaffoldエントリから動的にサブコマンドを生成するように変更（既存の固定コマンドとの後方互換性を維持）

