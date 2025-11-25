# 🧾 CHANGELOG（変更履歴ガイド）

このファイルは、プロダクト全体の **機能・設計・運用ドキュメントの更新履歴** を統一フォーマットで記録します。  
目的は、  
- 変更の意図と影響範囲を機械・人間の両方が追跡できるようにすること  
- PRD／BEH／DSG／ADR／TASK／OPS の更新を横断的に可視化すること  
です。

---

## 構成と記法

```text
## [version] - YYYY-MM-DD
### Added
- 新しく追加された機能・ドキュメント
### Changed
- 既存の内容を更新・修正した項目
### Deprecated
- 今後削除予定の項目
### Removed
- 削除した項目
### Fixed
- 修正した不具合・誤記
### Security
- セキュリティ関連の更新
```

例：

```markdown
## [0.3.0] - 2025-11-12
### Added
- PRD-EUTELO-CORE / BEH-EUTELO-CORE を追加
- SUB-PRD-EUTELO-CORE-DISTRIBUTION を承認
### Changed
- tasks/README.md を AI・TDD 基準に改訂
### Fixed
- contracts/README.md の昇格基準表記ミスを修正
```

---

## [Unreleased]
### Added
- DocumentType拡張機能: Configで定義されたカスタムDocumentTypeが自動的にCLIコマンドとして利用可能になる機能を追加
- DocumentTypeRegistry: Configから解決されたDocumentTypeの一覧とメタデータを管理するレジストリを追加
- カスタムDocumentTypeのサポート: `eutelo.config.*`でscaffoldエントリを定義すると、自動的に`eutelo add <custom-type>`コマンドが生成される
- 未登録DocumentTypeの警告機能: ValidationServiceとGraphServiceで未登録のDocumentTypeに対して警告を出力する機能を追加
- Frontmatter固定値自動注入機能: scaffold設定の`frontmatterDefaults`で`type`と`parent`を自動注入する機能を追加
- `frontmatterDefaults`設定: scaffoldエントリに`frontmatterDefaults.type`と`frontmatterDefaults.parent`を設定可能に
- ルートドキュメントのサポート: `parent: /`を設定することでルートドキュメントとして扱う機能を追加
- TemplateServiceのfrontmatter上書き機能: テンプレートレンダリング時に`frontmatterDefaults`の値でfrontmatterを自動上書きする機能を追加
### Changed
- preset-defaultの更新: すべてのscaffoldエントリに`frontmatterDefaults`を追加し、`prd`、`task`、`ops`は`parent: /`に設定
- ValidationServiceの改善: `parent`フィールドが必須であることを検証し、`parent: /`の場合はルートドキュメントとして扱うように変更
- GraphBuilderの改善: `parent: /`の場合はエッジを作成せず、orphan nodeとして扱わないように変更
- AddDocumentService: Configからscaffoldエントリを検索するように変更し、未登録DocumentTypeに対して`DocumentTypeNotFoundError`をスロー
- CLI: Config解決後にscaffoldエントリから動的にサブコマンドを生成するように変更（既存の固定コマンドとの後方互換性を維持）
- ValidationService: Configから解決されたDocumentTypeのみを許可し、未登録DocumentTypeに対して警告を出力
- GraphService: 未登録DocumentTypeのドキュメントを警告として記録する機能を追加
### Fixed
- GuardService: エラーハンドリングを改善し、より詳細なエラーメッセージを表示
- GuardService: デバッグモードでエラーの詳細情報（エラータイプ、スタックトレースなど）を出力する機能を追加

## [0.2.2] - 2025-01-XX
### Changed
- GuardService: "No valid documents found" メッセージを詳細化（提供されたパス数、スキップされたファイル、考えられる理由を表示）
- GuardService: LLM応答をログ出力する機能を追加（EUTELO_GUARD_DEBUG環境変数で制御）

## [0.2.1] - 2025-01-XX
### Fixed
- DocumentLoader: README.md、テンプレートファイル、philosophy配下のファイルを自動的にスキップするように改善
- GuardService: 一部のファイルが読み込めなくても、有効なドキュメントがあれば続行するように改善

## [0.2.0] - 2025-01-XX
### Added
- GuardService実装: DocumentLoader, PromptBuilder, LLMClient, Analyzerを追加（PRD-DOC-GUARD, BEH-DOC-GUARD, DSG-DOC-GUARD）
- OpenAI互換APIクライアント実装（ADR-DOC-GUARD-0001）
- ドキュメント整合性チェック機能（LLMベース）

### Changed
- GuardService: プレースホルダー実装から本実装へ移行
- 環境変数未設定時のエラーハンドリングを改善

---

## 運用ルール

- **すべてのPR／マージで更新必須。**  
  - 対応ドキュメントID（例：`PRD-EUTELO-CORE`）を明示。
  - 変更理由を1行で要約。
- **日付はマージ日基準。**
- **バージョン表記は SemVer。**
- **自動生成CI**：`dox-kit changelog update` で Frontmatter から更新を抽出し差分生成。  
- **AI支援**：LLMが diff 内容から自動要約を提案。  
  提案は `### AI Summary:` ブロックに一時保存し、レビュー後手動確定。

---

## LLM / CI 連携仕様（`doc-guard` 検証項目）

| チェック項目 | 内容 | 判定基準 |
|---------------|------|-----------|
| **Structure** | 各セクションが正しい順序で存在する | ✅ `Added`〜`Security` |
| **DateFormat** | `YYYY-MM-DD` 構文 | ✅ |
| **VersionConsistency** | PRD / package.json / Frontmatter の version と一致 | ✅ |
| **ReferenceIntegrity** | 記載されたドキュメントIDが実在する | ✅ |
| **SummaryQuality** | LLM要約と人間レビュー差分 < 20% | ⚠️ 自動計測指標 |
| **CI Integration** | Push時に自動生成されているか | ✅ |

---

## 変更のスコープと責任

| 層 | 記録例 | 更新責任者 |
|----|---------|------------|
| **PRD / BEH** | 機能・体験仕様の追加／改訂 | PdM・設計リード |
| **DSG / CONTRACTS / ADR** | 設計方針・API・判断の更新 | テックリード・アーキ |
| **TASKS** | 実装／テスト／運用の変更 | 開発チーム |
| **OPS** | Runbook・インシデント対応更新 | SRE・Opsチーム |

---

## バージョン更新手順（手動運用時）

1. 新規ブランチ作成（例：`release/v0.3.1`）  
2. `CHANGELOG.md` にセクション追加  
3. 対応PRD / BEH / DSG / ADR / TASK / OPS の更新を反映  
4. CIチェック（`doc-guard changelog-validate`）  
5. マージ後、タグ付け（`git tag v0.3.1`）  

---

## 自動生成ワークフロー例（GitHub Actions）

```yaml
name: Update Changelog
on:
  push:
    branches: [main]
jobs:
  update-changelog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Update changelog from docs
        run: npx dox-kit changelog update --auto
      - name: Commit changes
        run: |
          git config user.name "dox-bot"
          git config user.email "bot@dox-kit"
          git add CHANGELOG.md
          git commit -m "chore: update changelog [skip ci]" || echo "No changes"
          git push
```

---

## 運用指針

- **CHANGELOGは「過去の真実」ではなく「進化の記録」**。  
- すべての変更はドキュメントIDで追跡可能。  
- LLMが読める整形構造を保ち、履歴をプロンプトとして活用できるようにする。  
- 変更粒度が大きい場合は、各セクションを複数ブロックに分割して明示。  
- Opsチームはリリース完了後、`runbook-release.md` に結果リンクを追記する。

---

> **目的:**  
> CHANGELOG は「コードとドキュメントの共通時系列」を提供する。  
> 人間とAIの双方が過去の判断と成果を安全に再利用できるようにするための基盤である。