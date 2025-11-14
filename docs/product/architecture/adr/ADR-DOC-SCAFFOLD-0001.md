---
id: ADR-DOC-SCAFFOLD-0001
type: adr
feature: doc-scaffold
title: Document Scaffold 開発基盤の選定
status: proposed
version: 0.1
parent: PRD-DOC-SCAFFOLD
owners: ["@AkhrHysd"]
last_updated: "2025-11-14"
---

# ADR-DOC-SCAFFOLD-0001  
Document Scaffold 開発基盤の選定

---

## 1. Context（背景）

Document Scaffold（以下 doc-scaffold）は、  
Eutelo 標準ドキュメント構造を外部プロジェクトに配布・生成するための  
**CLI / サービス / テンプレート処理基盤**を持つ。

この機能は以下を前提とする:

- CLI として実行される  
- Node.js や CI（GitHub Actions）で確実に動作する  
- テンプレートをパッケージにバンドルする  
- 将来的に “テンプレのローカル上書き” や “差分比較” に拡張できる  
- TDD によるユニット / 統合 / E2E テストが必要  
- monorepo（packages/**）内で管理する

これら要件のため、本機能の **開発基盤（ランタイム・パッケージ構成・CLI実装方針・テスト基盤）** を  
ここで明示的に決定する。

---

## 2. Decision Drivers（意思決定の判断基準）

判断基準は以下の通り:

1. **Node.js / npm エコシステムとの親和性**  
   Eutelo の他パッケージと整合性があること。

2. **配布の容易さ**  
   `npx eutelo ...` のように動作すること。

3. **テンプレートを含むパッケージのサイズと構成**  
   CLIとテンプレートは独立可能か？

4. **TDD がしやすい構造**  
   service 層を単体でテストできる必要がある。

5. **CLI のメンテナンス性**  
   サブコマンドの追加が容易であること。

6. **E2E テストの実行容易性**  
   CLIを実際に subprocess として実行して確認したい。

7. **将来の高速化に道を残す**  
   Bun / Deno / Rust CLI への再実装も理論上可能な構造が望ましい。

---

## 3. Considered Options（検討した選択肢）

### 3.1 ランタイム選択

| 候補 | 利点 | 欠点 |
|------|------|-------|
| **Node.js 18+** | 最も互換性が高い、CI と相性抜群、npm配布が容易 | 実行速度は平凡 |
| Bun | 速い、バンドラ内蔵 | Windows & CI の安定性がまだ不十分 |
| Deno | セキュア、型強い | npmとの相性に問題、多くのCLIライブラリが未対応 |
| Rust（CLIのみ） | 高速、単体バイナリ | JSテンプレ・JSロジックの呼び出しが複雑 |
| Go（CLIのみ） | 配布簡単、軽い | Nodeとの連携層が必要になる |

### 結論（後述の Decisions で確定）
**Node.js 18+ が最も現実的**。

---

### 3.2 CLIフレームワーク

| 候補 | 利点 | 欠点 |
|------|------|-------|
| **Commander.js** | シンプル、最小依存、拡張しやすい | 大規模CLIには足りない部分がある |
| oclif | 大規模CLI向き、subcommandが強力 | フットプリントが大きい |
| yargs | 柔軟、実績が多い | サブコマンド分離がやや弱い |
| node:builtin（手書き） | 依存最小 | メンテ負担が高い |

将来拡張より “軽さと単純さ” を優先するなら Commander が適している。

---

### 3.3 パッケージ構成（monorepo 上）

候補A：単一パッケージ  
```
packages/
  cli/
```

候補B：役割ごとに分割  
```
packages/
  cli/
  core/           # ScaffoldService/TemplateService/ValidationService
  distribution/   # templates/
```

候補C：テンプレートだけ外出し
```
packages/
  cli/
  templates/
```

### 結論（後述）
**B案：cli / core / distribution の 3分割構成**  
（CLIを薄くし、ロジックを core に寄せるのが TDD に向く）

---

### 3.4 テンプレートの取り扱い

- distribution パッケージにテンプレを格納  
- CLI は distribution を依存として参照  
- 将来は `eutelo.templates/` でローカル上書きを許可（今は非対応）

→ **バンドル方式（パッケージ内の静的ファイル）を採用**

---

### 3.5 テスト基盤選択

| 種類 | 利用内容 |
|------|-----------|
| Unit test | TemplateService / ValidationService |
| Integration test | FileSystemAdapter / ScaffoldService |
| E2E test | `eutelo add/init/sync/check` を実プロセスで動かす |

候補：

- **Vitest（現状の基盤と合う・速度が速い）**
- Node Test Runner（軽いがテストエコシステムが薄い）
- Jest（重い）

### 結論
**Vitest + execa（E2E）** が最適。

---

### 3.6 配布方式

- npm パッケージとして配布
- インストール方法  
  - `npm i -D eutelo`  
  - `npx eutelo add prd AUTH`  
  - CI も `npx` で呼び出し可能
- bunx / pnpx も併用可能

---

## 4. Decision（決定）

最終的な決定は以下とする。

### 4.1 ランタイム  
**Node.js 18+** を採用。  
理由：  
- CI での安定性と互換性  
- テンプレ処理やファイル操作のエコシステムが最も成熟  
- Eutelo 全体との整合性

---

### 4.2 CLIフレームワーク  
**Commander.js** を採用。  
理由：  
- add subcommand との相性が良い  
- 依存が少なく軽量  
- 将来別ランタイムに載せ替える際にも移植性が高い

---

### 4.3 パッケージ構成  
**3層構造（cli / core / distribution）** を採用。

```
packages/
  cli/             # CLI 実装
  core/            # ScaffoldService / TemplateService / ValidationService
  distribution/    # templates/ （唯一のテンプレソース）
```

理由：

- core が pure logic となり TDD が容易  
- CLI は薄い  
- distribution の独立によりテンプレ差し替えも容易

---

### 4.4 テンプレート方式  
**distribution パッケージに静的ファイルとしてバンドル**。  
理由：  
- 確実に CLI から参照できる  
- バージョンごとにテンプレの整合が取れる  
- テンプレ改修が容易

将来のローカル上書きは優先度低として先送り。

---

### 4.5 テスト基盤  
**Vitest（unit/integration） + execa（E2E）** を採用。  
理由：  
- 起動が速く TDD 向き  
- mock も柔軟  
- E2E は execa で CLI 実体をテストできる

---

### 4.6 配布方式  
**npm パッケージ配布を前提とし、 npx / pnpx / bunx から実行可能にする。**

---

## 5. Consequences（影響）

### 良い影響
- Eutelo 内すべての環境で動作保証が容易  
- TDDで書きやすく、core が薄い純粋ロジックになる  
- パッケージ分割により依存が明確  
- CI の環境構築が最小限

### 懸念・トレードオフ
- Rust や Go の単体バイナリほど高速ではない  
- テンプレ上書き機能が未対応（将来の課題）  
- distribution と cli のバージョン整合が必要

### 将来の変更が必要になる可能性
- テンプレ差分の検出（doc-guard 連携）  
- CLI の高速化（Bun / Rust CLI 移行）  
- 設定ファイル（eutelo.config）導入  
- Mac/Linux/Winのパス差異対応の追加検証

---

## 6. Status（状態）

status: **proposed**  
→ このADRはレビューを前提とし、合意後に **accepted** に更新する。

---

## 7. References

- PRD-DOC-SCAFFOLD  
- DSG-DOC-SCAFFOLD  
- BEH-DOC-SCAFFOLD  
- TASK-doc-scaffold-*  

---