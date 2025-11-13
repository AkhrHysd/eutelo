---
id: BEH-DOC-SCAFFOLD
type: behavior
feature: doc-scaffold
title: Document Scaffold & CI Integration 機能 BEHAVIOR
purpose: >
  Eutelo が定義する標準ドキュメント構造を、
  既存プロジェクトに安全かつ非破壊的に追加・維持するための
  CLI および CI の観察可能な挙動（正常/異常/境界）を Gherkin で定義する。
status: draft
version: 0.1
parent: PRD-DOC-SCAFFOLD
owners: ["@AkhrHysd"]
tags: ["doc-scaffold", "behavior", "gherkin"]
last_updated: "2025-11-14"
---

# BEH-DOC-SCAFFOLD

Eutelo の標準ドキュメント構造を、既存プロジェクトに対して

- 破壊的変更なしで導入できること
- テンプレートが存在する種類のドキュメントだけを `eutelo add` で生成できること
- CI 上で不足や不整合を検出できること

を確認するための振る舞いを Gherkin で定義する。

---

## 1. 初期スキャフォールド（`eutelo init`）

### 1-1. 空のプロジェクトに対して標準構造を生成する（正常系）

```gherkin
@init @normal
Feature: Initialize Eutelo document structure in an empty project

  Background:
    Given an empty project directory
      And the current working directory is the project root

  Scenario: eutelo init generates the standard document structure
    When I run "eutelo init"
    Then a "docs" directory should exist
      And a "docs/product/features" directory should exist
      And a "docs/architecture/design" directory should exist
      And a "docs/architecture/adr" directory should exist
      And a "docs/tasks" directory should exist
      And a "docs/ops" directory should exist
    And template guide files should be created where defined
    And no existing files should be overwritten
```

### 1-2. 既存の docs/ があるプロジェクトでも非破壊で実行できる（境界系）

```gherkin
@init @boundary
Feature: Initialize structure without destructive changes on existing docs

  Background:
    Given a project directory with an existing "docs" directory
      And "docs/README.md" already exists with user content
      And the current working directory is the project root

  Scenario: eutelo init does not overwrite existing docs
    When I run "eutelo init"
    Then the file "docs/README.md" should still exist
      And the content of "docs/README.md" should not be changed
    And missing standard directories under "docs" should be created
    And a summary of created items should be printed to stdout
```

---

## 2. 非破壊同期（`eutelo sync`）

### 2-1. 不足しているテンプレートのみ自動追加される（正常系）

```gherkin
@sync @normal
Feature: Sync missing templates

  Background:
    Given a project with an initialized Eutelo document structure
      And "docs/product/features" contains some feature documents
      And some expected template files are missing

  Scenario: eutelo sync creates only missing template files
    When I run "eutelo sync"
    Then only missing template files should be created
      And existing feature files should not be modified
      And existing architecture files should not be modified
    And the command exit code should be 0
```

### 2-2. 変更が不要な場合は何も書き込まない（待機系）

```gherkin
@sync @idle
Feature: Sync is a no-op when everything is up-to-date

  Background:
    Given a project where all required template files already exist
      And there are no missing Eutelo template files

  Scenario: eutelo sync performs no write when nothing is missing
    When I run "eutelo sync"
    Then no files should be created
      And no files should be modified
    And the command output should indicate "no changes"
    And the command exit code should be 0
```

---

## 3. テンプレートからのドキュメント生成（`eutelo add`）

ここでは「テンプレートが存在するドキュメント種別」のみを対象とする。  
対象: PRD / BEH / SUB-PRD / SUB-BEH / DSG / ADR / TASK / OPS

### 3-1. PRD をテンプレートから生成する（正常系）

```gherkin
@add @prd @normal
Feature: Generate PRD document from template

  Background:
    Given a project with an initialized Eutelo document structure
      And a PRD template is available for features
      And the feature key is "AUTH"

  Scenario: eutelo add prd AUTH generates a new PRD from template
    When I run "eutelo add prd AUTH"
    Then the file "docs/product/features/AUTH/PRD-AUTH.md" should be created
    And the frontmatter "id" should be "PRD-AUTH"
    And the frontmatter "feature" should be "AUTH"
    And the frontmatter "title" should contain "AUTH 機能 PRD"
    And the frontmatter "parent" should be set to "PRINCIPLE-GLOBAL" or a valid parent
    And the frontmatter "purpose" field should exist and not be empty
```

### 3-2. 既に存在する PRD に対しては上書きしない（異常系）

```gherkin
@add @prd @error
Feature: Do not overwrite existing PRD files

  Background:
    Given a project with an initialized Eutelo document structure
      And the file "docs/product/features/AUTH/PRD-AUTH.md" already exists

  Scenario: eutelo add prd AUTH refuses to overwrite an existing PRD
    When I run "eutelo add prd AUTH"
    Then the command exit code should be non-zero
    And the file "docs/product/features/AUTH/PRD-AUTH.md" should remain unchanged
    And the command output should indicate that the target file already exists
```

### 3-3. テンプレートが存在しない種類に対してはエラーとなる（異常系）

```gherkin
@add @error
Feature: Reject add command for types without templates

  Background:
    Given a project with an initialized Eutelo document structure
      And there is no template for the document type "unknown-type"

  Scenario: eutelo add unknown-type FOO fails when template is missing
    When I run "eutelo add unknown-type FOO"
    Then the command exit code should be non-zero
    And no new files should be created
    And the command output should clearly state that no template is defined
```

### 3-4. BEH をテンプレートから生成し PRD と整合する（正常系）

```gherkin
@add @beh @normal
Feature: Generate BEH document from template and link to PRD

  Background:
    Given a project with an initialized Eutelo document structure
      And a BEH template is available for features
      And the feature key is "AUTH"
      And the file "docs/product/features/AUTH/PRD-AUTH.md" exists

  Scenario: eutelo add beh AUTH generates BEH and links to the PRD
    When I run "eutelo add beh AUTH"
    Then the file "docs/product/features/AUTH/BEH-AUTH.md" should be created
    And the frontmatter "feature" should be "AUTH"
    And the frontmatter "parent" should be "PRD-AUTH"
    And the behavior document should contain at least one valid Gherkin "Feature" definition
```

### 3-5. SUB-PRD/SUB-BEH を生成する（正常系）

```gherkin
@add @sub @normal
Feature: Generate SUB-PRD and SUB-BEH from templates

  Background:
    Given a project with an initialized Eutelo document structure
      And PRD and BEH documents for feature "AUTH" already exist
      And SUB key "LOGIN" is defined by the user

  Scenario: eutelo add sub-prd AUTH LOGIN generates SUB-PRD
    When I run "eutelo add sub-prd AUTH LOGIN"
    Then the file "docs/product/features/AUTH/SUB-PRD-LOGIN.md" should be created
    And the frontmatter "parent" should be "PRD-AUTH"
    And the frontmatter "feature" should be "AUTH"

  Scenario: eutelo add sub-beh AUTH LOGIN generates SUB-BEH
    When I run "eutelo add sub-beh AUTH LOGIN"
    Then the file "docs/product/features/AUTH/BEH-AUTH-LOGIN.md" should be created
    And the frontmatter "parent" should be "SUB-PRD-LOGIN"
    And the behavior document should contain at least one valid Gherkin "Feature" or "Scenario"
```

### 3-6. DSG/ADR/TASK/OPS をテンプレがある場合のみ生成する（正常系）

```gherkin
@add @design @adr @task @ops @normal
Feature: Generate other document types only when templates exist

  Background:
    Given a project with an initialized Eutelo document structure

  Scenario: eutelo add dsg AUTH creates DSG file when DSG template exists
    Given a DSG template exists for features
    When I run "eutelo add dsg AUTH"
    Then "docs/architecture/design/AUTH/DSG-AUTH.md" should be created

  Scenario: eutelo add adr AUTH creates ADR file when ADR template exists
    Given an ADR template exists for features
    When I run "eutelo add adr AUTH"
    Then an ADR file "docs/architecture/adr/AUTH/ADR-AUTH-0001.md" should be created

  Scenario: eutelo add task setup-ci creates a task file when TASK template exists
    Given a task template exists
    When I run "eutelo add task setup-ci"
    Then "docs/tasks/TASK-setup-ci.md" should be created

  Scenario: eutelo add ops doc-scaffold-ci creates an ops file when OPS template exists
    Given an ops template exists
    When I run "eutelo add ops doc-scaffold-ci"
    Then "docs/ops/OPS-doc-scaffold-ci.md" should be created
```

---

## 4. CI との連携

### 4-1. 不足テンプレートと構造不整合の検出（正常系）

```gherkin
@ci @normal
Feature: Detect missing templates and structural violations on CI

  Background:
    Given a project with partially missing Eutelo documents
      And a CI pipeline that runs "eutelo sync --check-only"

  Scenario: CI fails when required templates are missing
    When the CI job runs
    Then the job should fail with a non-zero exit code
    And the CI logs should list missing documents by path
    And no files should be created or modified during the check-only run
```

### 4-2. purpose の有無や命名規則の検証（正常系）

```gherkin
@ci @purpose @naming
Feature: Validate purpose existence and naming rules on CI

  Background:
    Given a project with several Eutelo documents
      And some documents are missing the "purpose" field
      And some documents do not follow the naming convention

  Scenario: CI detects documents without purpose and invalid naming
    When the CI job runs "eutelo check"
    Then the job should fail with a non-zero exit code
    And the CI logs should list all documents missing "purpose"
    And the CI logs should list all documents with invalid naming or path
```

### 4-3. CI 上での自動スキャフォールドと PR 提案（待機系）

```gherkin
@ci @sync @idle
Feature: CI proposes scaffold changes as pull requests

  Background:
    Given a project with missing optional documents
      And a CI pipeline configured to run "eutelo sync --apply-on-branch"
      And a VCS provider that supports pull requests

  Scenario: CI opens a pull request with scaffolded changes
    When the CI job runs on the default branch
    Then a new branch with scaffolded files should be created
    And a pull request should be opened with those scaffolded changes
    And no changes should be pushed directly to the default branch
```

---

## 5. エラーメッセージと UX

### 5-1. エラー時には原因が明確に表示される（異常系）

```gherkin
@error @ux
Feature: Show clear error messages for user mistakes

  Background:
    Given a project with an initialized Eutelo document structure

  Scenario Outline: User mistakes are reported with clear messages
    When I run "eutelo add <type> <args>"
    Then the command exit code should be non-zero
    And the error output should include "<expected_message>"

    Examples:
      | type       | args             | expected_message                      |
      | prd        | ""               | feature key is required               |
      | beh        | "AUTH EXTRA"     | too many arguments                    |
      | unknown    | "AUTH"           | unsupported document type             |
      | dsg        | "AUTH"           | DSG template is not defined           |
      | prd        | "INVALID-NAME"   | feature key contains invalid pattern  |
```

---

この BEHAVIOR によって、

- init/sync/add/CI の主要ユースケースが一通りカバーされていること
- 「テンプレが存在するものだけ add できる」という仕様がテスト観点として明文化されていること

を確認できる。

---