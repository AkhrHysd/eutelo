# 🧾 CHANGELOG

このファイルは、`@eutelo/cli` パッケージの変更履歴を記録します。

---

## 変更履歴

## [Unreleased]

### Added
- `eutelo align` コマンド: ドキュメント間の一貫性チェックを実行（`eutelo guard` の新しい名前）
- `eutelo rule` コマンド: ユーザー定義ルールに対してドキュメントを検証（`eutelo validate` の新しい名前）

### Deprecated
- `eutelo guard` コマンド: 非推奨となり、将来のバージョンで削除されます。代わりに `eutelo align` を使用してください。
- `eutelo validate` コマンド: 非推奨となり、将来のバージョンで削除されます。代わりに `eutelo rule` を使用してください。

### Changed
- コマンド名の変更: 実態をより的確に表すコマンド名に変更
  - `eutelo guard` → `eutelo align`（ドキュメント間の整合性を取る）
  - `eutelo validate` → `eutelo rule`（ユーザー定義ルールに対する検証）

## [0.4.1] - 2025-11-27

### Added
- guard コマンド: 関連ドキュメント自動収集オプションを追加
  - `--with-related`: 関連ドキュメント収集を有効化（デフォルト）
  - `--no-related`: 関連ドキュメント収集を無効化
  - `--depth <n>`: 探索深度を指定（デフォルト: 1）
  - `--all`: 深度に関係なくすべての関連ドキュメントを収集

## [0.4.0] - 2025-11-25

### Added
- DocumentType拡張機能: Configで定義されたカスタムDocumentTypeが自動的にCLIコマンドとして利用可能になる機能を追加
- カスタムDocumentTypeのサポート: `eutelo.config.*`でscaffoldエントリを定義すると、自動的に`eutelo add <custom-type>`コマンドが生成される

### Changed
- AddDocumentService: Configからscaffoldエントリを検索するように変更し、未登録DocumentTypeに対して`DocumentTypeNotFoundError`をスロー
- CLI: Config解決後にscaffoldエントリから動的にサブコマンドを生成するように変更（既存の固定コマンドとの後方互換性を維持）

