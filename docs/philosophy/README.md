# Philosophy Directory Guide

このディレクトリは、プロダクト開発の思想的基盤を整理・共有するための領域です。  
Vision / Core Values / Principles といった上位概念を格納し、  
プロジェクト全体の判断と行動の共通軸を提供します。

---

## 目的

- 組織やプロジェクトの「なぜ」「どうあるべきか」を明文化する。  
- Vision, Core Values, Principles を通して思想から運用までを一貫させる。  
- 職能・役割を超えて共通の原理で意思決定できるようにする。  
- ドキュメント体系全体の最上位として、下位層（PRD・BEH・DSG 等）の根拠を提供する。

---

## 構成例

```
philosophy/
 ├── vision-and-core-values.md
 ├── principles/
 │    ├── global-principles.md
 │    ├── principle-engineering.md
 │    ├── principle-product.md
 │    ├── principle-design.md
 │    └── principle-ai.md
 └── README.md
```

---

## 各文書の役割

| ファイル | 内容 | 更新頻度 |
|-----------|------|-----------|
| **vision-and-core-values.md** | 理念と価値観。プロジェクト全体の方向性を定義する。 | 低 |
| **principles/** | 実務上の判断・行動を導く原則群。必要に応じて職能別に分割する。 | 中 |
| **principles/global-principles.md** | 職能をまたぐ共通原則をまとめる。 | 中 |
| **principles/principle-*.md** | エンジニアリング、デザイン、プロダクト、AIなどの領域別原則。 | 中 |
| **README.md** | このガイド。philosophy ディレクトリの目的と運用方針を示す。 | 低 |

---

## 運用指針

- すべての文書に `purpose:` を明記し、上位文書との整合性を保つ。  
- Vision → Core Values → Principles の階層関係を維持する。  
- 原則の変更や追加は Pull Request で行い、AI による整合チェックを通す。  
- 意図や判断に変化が生じた場合は、新しいバージョンの文書を作成する。  
- 下位層（PRD・BEH・DSG など）は常にこれらの理念・原則を参照して作成する。  

---

## 原則の分割方針

プロジェクトの規模や職能構成に応じて、Principles は以下のいずれかの形で運用する。

### 単一ファイル運用（初期段階）
- `principles/global-principles.md` のみを利用。  
- 全職能共通の行動指針を集約する。

### 職能・責務別運用（拡張段階）
- プロジェクトが成長したら、職能や責務単位で分割する。  
- 各原則は役割に即した判断・行動の基準を明示する。  

例：
- `principle-engineering.md`：設計・実装・品質管理の原則  
- `principle-product.md`：要件定義・スコープ設計の原則  
- `principle-design.md`：体験設計・情報構造化の原則  
- `principle-ai.md`：AI協業・自動生成・検証に関する原則  

---

## 更新とレビュー

- **自動検証**：必須キーや親子整合を LLM/CI で確認する。  
- **人的レビュー**：内容が上位文書の purpose に従っているかを確認する。  
- Vision/Core Values 変更時は、関連する Principles の再検証を行う。  

---

## まとめ

- philosophy は文書体系の最上位に位置する。  
- Vision / Core Values / Principles が「思想から実務」への橋渡しとなる。  
- 職能に応じて柔軟に原則を分割し、全員が同じ目的に従って行動できる構造を維持する。 