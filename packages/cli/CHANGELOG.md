# 🧾 CHANGELOG

このファイルは、`@eutelo/cli` パッケージの変更履歴を記録します。

---

## 変更履歴

## [0.5.1] - 2025-12-12

### Changed
- メンテナンスリリース


## [0.5.0] - 2025-12-12

### Breaking Changes
- `eutelo guard` コマンドを `eutelo align` に名称変更（後方互換性のため `eutelo guard` も引き続き使用可能）
- `eutelo validate` コマンドを `eutelo rule` に名称変更（後方互換性のため `eutelo validate` も引き続き使用可能）
- `eutelo graph` コマンド全体を削除（`eutelo align --with-related` で代替）
- `eutelo config inspect` コマンドを削除

### Added
- `eutelo align` コマンド: ドキュメント間の一貫性チェックを実行（旧 `eutelo guard`）
- `eutelo rule` コマンド: ユーザー定義ルールに対してドキュメントを検証（旧 `eutelo validate`）

### Changed
- コマンド名の変更: 実態をより的確に表すコマンド名に変更
  - `eutelo guard` → `eutelo align`（ドキュメント間の整合性を取る）
  - `eutelo validate` → `eutelo rule`（ユーザー定義ルールに対する検証）

### Removed
- `eutelo graph` コマンド: 関連ドキュメント収集は `eutelo align` に統合
- `eutelo config inspect` コマンド
- `eutelo init --placeholder-format` オプション
- `eutelo guard --japanese`/`--ja` オプション

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

