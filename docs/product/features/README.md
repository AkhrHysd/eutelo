# 📦 features/（機能ドキュメント）ガイド

このディレクトリは **機能単位** の要件（PRD）と体験（BEHAVIOR）を管理します。  
- PRD … 目的/KPI/スコープを定義（実装詳細は書かない）  
- BEH … 観察可能な挙動をGherkinで定義（正常/異常/待機）

## 置き場所と命名
```
features/
  {FEATURE}/
    PRD-{FEATURE}.md
    SUB-PRD-{SUB}.md
    BEH-{FEATURE}.md
    BEH-{FEATURE}-{SUB}.md
```
- サブは **1階層のみ**。更に分岐したくなったら昇格・再編。
- PRD ↔ BEH は 1:1（メイン/サブそれぞれ）

## 参照
- 設計は `architecture/design/{FEATURE}/` を参照
- 共有契約は `architecture/contracts/` を参照