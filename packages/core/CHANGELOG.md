# 🧾 CHANGELOG

このファイルは、`@eutelo/core` パッケージの変更履歴を記録します。

---

## 変更履歴

## [0.4.0] - 2025-11-25

### Added
- DocumentTypeRegistry: Configから解決されたDocumentTypeの一覧とメタデータを管理するレジストリを追加
- 未登録DocumentTypeの警告機能: ValidationServiceとGraphServiceで未登録のDocumentTypeに対して警告を出力する機能を追加
- Frontmatter固定値自動注入機能: scaffold設定の`frontmatterDefaults`で`type`と`parent`を自動注入する機能を追加
- TemplateServiceのfrontmatter上書き機能: テンプレートレンダリング時に`frontmatterDefaults`の値でfrontmatterを自動上書きする機能を追加
- ルートドキュメントのサポート: `parent: /`を設定することでルートドキュメントとして扱う機能を追加

### Changed
- ValidationServiceの改善: `parent`フィールドが必須であることを検証し、`parent: /`の場合はルートドキュメントとして扱うように変更
- GraphBuilderの改善: `parent: /`の場合はエッジを作成せず、orphan nodeとして扱わないように変更
- ValidationService: Configから解決されたDocumentTypeのみを許可し、未登録DocumentTypeに対して警告を出力
- GraphService: 未登録DocumentTypeのドキュメントを警告として記録する機能を追加

### Fixed
- GuardService: エラーハンドリングを改善し、より詳細なエラーメッセージを表示
- GuardService: デバッグモードでエラーの詳細情報（エラータイプ、スタックトレースなど）を出力する機能を追加

