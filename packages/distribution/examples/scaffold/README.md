# Scaffold 構成例（参考用）

このディレクトリは、Eutelo ドキュメント構造を新規プロジェクトに適用する際の
**構成例（例示のみ）** を提供しています。

> **Note:**  
> 本パッケージでは実装コードは含まれていません。  
> 実際の scaffold ツールやスクリプトは別途実装が必要です。

---

## 構成例

### 基本的なディレクトリ構造

```
your-project/
  docs/
    philosophy/
      vision-and-core-values.md
      principles/
        global-principles.md
    
    product/
      features/
        README.md
        _template-prd.md
        _template-beh.md
        {FEATURE}/
          PRD-{FEATURE}.md
          BEH-{FEATURE}.md
      
      architecture/
        design/
          README.md
          _template-dsg.md
          {FEATURE}/
            DSG-{FEATURE}.md
        
        adr/
          README.md
          _template-adr.md
          ADR-{SEQ}-{topic}.md
        
        contracts/
          README.md
      
      tasks/
        README.md
        _template-task.md
        TSK-{FEATURE}.md
    
    ops/
      README.md
      _template-runbook.md
      runbook-{topic}.md
  
  CHANGELOG.md
```

---

## テンプレートの利用方法（例示）

### 1. テンプレートのコピー

```bash
# @eutelo/distribution からテンプレートを取得
npm install @eutelo/distribution

# テンプレートをプロジェクトにコピー
cp node_modules/@eutelo/distribution/templates/_template-prd.md docs/product/features/_template-prd.md
cp node_modules/@eutelo/distribution/templates/_template-beh.md docs/product/features/_template-beh.md
cp node_modules/@eutelo/distribution/templates/_template-dsg.md docs/product/architecture/design/_template-dsg.md
cp node_modules/@eutelo/distribution/templates/_template-adr.md docs/product/architecture/adr/_template-adr.md
cp node_modules/@eutelo/distribution/templates/_template-task.md docs/product/tasks/_template-task.md
```

### 2. 構成ガイドの参照

```bash
# DIRECTORY_GUIDE.md を参照
cat node_modules/@eutelo/distribution/config/DIRECTORY_GUIDE.md
```

### 3. 新規ドキュメントの作成（手動例）

```bash
# PRD の作成例
cp docs/product/features/_template-prd.md docs/product/features/MY-FEATURE/PRD-MY-FEATURE.md

# テンプレート内の変数を置換
# {FEATURE} → MY-FEATURE
# {VERSION} → 0.1.0
# {DATE} → 2025-11-13
# など
```

---

## 自動化の可能性（実装は別途必要）

将来的には、以下のような scaffold ツールが実装される可能性があります：

- `npx @eutelo/scaffold init` - プロジェクト初期化
- `npx @eutelo/scaffold create prd --feature MY-FEATURE` - PRD作成
- `npx @eutelo/scaffold create beh --feature MY-FEATURE` - BEH作成
- `npx @eutelo/scaffold validate` - ドキュメント構造検証

ただし、これらの実装は本パッケージ（`@eutelo/distribution`）のスコープ外です。

---

## 関連ドキュメント

- [DIRECTORY_GUIDE.md](../../config/DIRECTORY_GUIDE.md) - ディレクトリ構造の詳細
- [テンプレート一覧](../../templates/) - 利用可能なテンプレート

