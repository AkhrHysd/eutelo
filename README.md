# EUTELO documentation

[日本語](README.jp.md) | English

Eutelo is a documentation toolkit based on the philosophy of purpose-driven, structured documentation.  
The CLI automatically resolves `eutelo.config.*` and presets, then executes Scaffold / Guard / Check / Graph according to the configuration (by default, it loads `@eutelo/preset-default`, which can be overridden by local configuration).

## Installation

### Install from Meta Package (Recommended)

Install all packages at once:

```bash
npm install @eutelo/eutelo
# or
pnpm add @eutelo/eutelo
# or
yarn add @eutelo/eutelo
```

### Install Individual Packages

Install only the packages you need:

```bash
# CLI tool only
npm install @eutelo/cli

# Core functionality only
npm install @eutelo/core

# Templates only
npm install @eutelo/distribution
```

## Configuration

Eutelo uses configuration files to define document templates, frontmatter schemas, and guard prompts. Configuration files can be written in TypeScript (`.ts`, `.mts`, `.cts`), JavaScript (`.js`, `.mjs`, `.cjs`), JSON (`.json`), or YAML (`.yaml`, `.yml`).

### Configuration File Location

Eutelo automatically searches for configuration files in the following order:
1. `eutelo.config.ts` / `eutelo.config.mts` / `eutelo.config.cts`
2. `eutelo.config.js` / `eutelo.config.mjs` / `eutelo.config.cjs`
3. `eutelo.config.json`
4. `eutelo.config.yaml` / `eutelo.config.yml`

You can also specify a custom path using the `--config <path>` option.

### Configuration Structure

```typescript
// eutelo.config.ts
import { defineConfig } from '@eutelo/core/config';

export default defineConfig({
  // Optional: Preset packages to extend
  presets: ['@eutelo/preset-default'],
  
  // Optional: Documentation root directory (default: 'eutelo-docs')
  docsRoot: 'docs',
  
  // Scaffold templates for document generation
  scaffold: {
    'feature.prd': {
      id: 'feature.prd',
      kind: 'prd',
      path: 'product/features/{FEATURE}/PRD-{FEATURE}.md',
      template: '_template-prd.md',
      variables: {
        ID: 'PRD-{FEATURE}',
        PARENT: '/'
      },
      frontmatterDefaults: {
        type: 'prd',
        parent: '/'
      }
    }
  },
  
  // Frontmatter schema definitions
  frontmatter: {
    // Root parent IDs (documents without parents)
    rootParentIds: ['PRINCIPLE-GLOBAL'],
    
    // Schema definitions for each document kind
    schemas: [
      {
        kind: 'prd',
        fields: {
          id: { type: 'string', required: true },
          type: { type: 'string' },
          parent: { type: 'string', relation: 'parent' },
          related: { type: 'array', relation: 'related' },
          tags: { type: 'array' },
          status: { type: 'enum', enum: ['draft', 'review', 'approved'] }
        }
      }
    ]
  },
  
  // Guard prompts for consistency checks
  guard: {
    prompts: {
      'guard.default': {
        id: 'guard.default',
        templatePath: 'prompts/guard-system.md',
        model: 'gpt-4o-mini',
        temperature: 0.2
      }
    }
  }
});
```

### Configuration Fields

#### `presets` (optional)
Array of preset package names. Presets are merged in order, with later presets and local configuration overriding earlier ones.

#### `docsRoot` (optional)
Root directory for documentation files. Defaults to `eutelo-docs`. Can be overridden with the `EUTELO_DOCS_ROOT` environment variable.

#### `directoryStructure` (optional)
Defines the directory structure to be created by `eutelo init`. Supports two formats:

**Array Format (simple):**
```typescript
directoryStructure: [
  [],                       // Root (docsRoot)
  ['product'],              // docsRoot/product
  ['product', 'features'],  // docsRoot/product/features
  ['architecture'],         // docsRoot/architecture
]
```

**Directory-File Definition Format (recommended):**
```typescript
directoryStructure: {
  'product': [],
  'product/features/{FEATURE}': [
    {
      file: 'PRD-{FEATURE}.md',
      kind: 'prd',                      // Document kind for eutelo add
      template: 'templates/prd.md',
      prefix: 'PRD-',
      variables: ['FEATURE'],
      rules: 'rules/prd-validation.md', // Rule file for eutelo rule (optional)
      frontmatterDefaults: {            // Frontmatter defaults
        type: 'prd',
        parent: '/'
      }
    },
    {
      file: 'BEH-{FEATURE}.md',
      kind: 'beh',
      template: 'templates/beh.md',
      prefix: 'BEH-',
      variables: ['FEATURE'],
      rules: 'rules/beh-validation.md', // Rule file for eutelo validate (optional)
      frontmatterDefaults: {
        type: 'behavior',
        parent: 'PRD-{FEATURE}'
      }
    }
  ],
  'architecture/design/{FEATURE}': [
    {
      file: 'DSG-{FEATURE}.md',
      kind: 'dsg',
      template: 'templates/dsg.md',
      prefix: 'DSG-',
      variables: ['FEATURE'],
      frontmatterDefaults: {
        type: 'design',
        parent: 'PRD-{FEATURE}'
      }
    }
  ]
}
```

**File Definition Fields:**
- `file`: File name pattern with placeholders (e.g., `PRD-{FEATURE}.md`)
- `kind`: Document kind used by `eutelo add` command (e.g., `'prd'`, `'beh'`, `'dsg'`)
- `template`: Template file path
- `prefix`: File name prefix (e.g., `PRD-`)
- `variables`: Array of variable names used in the path/file
- `rules`: Rule file path for `eutelo rule` (optional, see `eutelo rule` section)
- `frontmatterDefaults`: Default frontmatter values:
  - `type`: Document type value
  - `parent`: Parent document ID (use `'/'` for root documents)

**Dynamic Paths:**
Paths containing placeholders like `{FEATURE}` are treated as dynamic paths. During `eutelo init`, these are converted to placeholder directories (e.g., `__FEATURE__`). Use `--skip-dynamic-paths` to skip creating these directories.

#### `scaffold` (deprecated)
> **Note:** The `scaffold` configuration is deprecated. Use `directoryStructure` with file definitions instead. `directoryStructure` entries are automatically converted to scaffold entries internally.

Object mapping scaffold IDs to template configurations:
- `id`: Unique identifier for the scaffold entry
- `kind`: Document kind (e.g., `'prd'`, `'beh'`, `'adr'`)
- `path`: File path pattern with placeholders (e.g., `{FEATURE}`, `{SUB}`)
- `template`: Template file path (relative to preset template root or project root)
- `variables`: Optional variables to inject into templates
- `frontmatterDefaults`: Optional fixed values for frontmatter fields that are automatically injected:
  - `type`: Required. Document type value (e.g., `'prd'`, `'behavior'`, `'design'`). Template variables like `{FEATURE}` can be used.
  - `parent`: Required. Parent document ID. Use `'/'` for root documents. Template variables like `{PARENT}` or `{FEATURE}` can be used.

#### `frontmatter` (optional)
Frontmatter configuration:
- `rootParentIds`: Array of document IDs that don't have parents
- `schemas`: Array of schema definitions for each document kind

**Field Types:**
- `string`: Text field
- `number`: Numeric field
- `boolean`: Boolean field
- `array`: Array field
- `enum`: Enum field (requires `enum` property with allowed values)
- `date`: Date field

**Field Options:**
- `required`: Whether the field is required (default: `false`)
- `enum`: Allowed values for enum fields
- `relation`: Relationship type (`'parent'` or `'related'`)

#### `guard` (optional)
Guard configuration:
- `prompts`: Object mapping prompt IDs to prompt configurations
  - `id`: Unique identifier for the prompt
  - `templatePath`: Path to the prompt template file
  - `model`: LLM model name (e.g., `'gpt-4o-mini'`, `'gpt-4o'`)
  - `temperature`: Temperature setting for the LLM (default: varies by model)

### Example: JSON Configuration

```json
{
  "presets": ["@eutelo/preset-default"],
  "docsRoot": "docs",
  "scaffold": {
    "feature.prd": {
      "id": "feature.prd",
      "kind": "prd",
      "path": "product/features/{FEATURE}/PRD-{FEATURE}.md",
      "template": "_template-prd.md"
    }
  },
  "frontmatter": {
    "rootParentIds": ["PRINCIPLE-GLOBAL"],
    "schemas": [
      {
        "kind": "prd",
        "fields": {
          "id": { "type": "string", "required": true },
          "type": { "type": "string" }
        }
      }
    ]
  },
  "guard": {
    "prompts": {
      "guard.default": {
        "id": "guard.default",
        "templatePath": "prompts/guard-system.md",
        "model": "gpt-4o-mini"
      }
    }
  }
}
```

### Example: YAML Configuration

```yaml
presets:
  - '@eutelo/preset-default'

docsRoot: docs

scaffold:
  feature.prd:
    id: feature.prd
    kind: prd
    path: product/features/{FEATURE}/PRD-{FEATURE}.md
    template: _template-prd.md

frontmatter:
  rootParentIds:
    - PRINCIPLE-GLOBAL
  schemas:
    - kind: prd
      fields:
        id:
          type: string
          required: true
        type:
          type: string

guard:
  prompts:
    guard.default:
      id: guard.default
      templatePath: prompts/guard-system.md
      model: gpt-4o-mini
```

### Preset Merging

Eutelo merges configurations from presets and your local configuration file:
1. Default preset (`@eutelo/preset-default`) is always loaded first
2. Additional presets specified in `presets` are merged in order
3. Local configuration file overrides preset values


## CLI Commands

> **Note**: CLI commands should be executed using one of the following methods.  
> All commands accept the `--config <path>` option to reference a specific `eutelo.config.*`. If omitted, the command automatically detects the configuration at the project root, merges it with presets, and calls the UseCase once.

### Execution Methods

**Method 1: Using `pnpm exec`/`npm exec` (Recommended)**

If you have `@eutelo/eutelo` or `@eutelo/cli` installed, you can execute commands with `pnpm exec`:

```bash
# First, install
pnpm add -w @eutelo/eutelo
# or
pnpm add -w @eutelo/cli

# Then, execute commands
pnpm exec eutelo init
pnpm exec eutelo add prd <feature>
```

**Method 2: Using `npx`**

You can execute commands without global installation if project dependencies are already installed (in CI, always use `npm ci` followed by `npx`).

```bash
npm ci
npx eutelo init
npx eutelo align docs/**/*.md --warn-only
```

**Method 3: Add to `package.json` `scripts` (Recommended)**

```json
{
  "scripts": {
    "eutelo:init": "pnpm exec eutelo init",
    "eutelo:add:prd": "pnpm exec eutelo add prd"
  }
}
```

**Method 4: Direct Reference to `node_modules/.bin`**

```json
{
  "scripts": {
    "eutelo:init": "node_modules/.bin/eutelo init"
  }
}
```

**Method 5: Global Installation (Optional)**

```bash
npm install -g @eutelo/cli
eutelo init
```

> **Note**: All commands are configuration-driven. When overriding template paths or docsRoot in local configuration, relative paths to templates/schemas are resolved from "the location of the configuration file" or "the current directory".  
> You can also override settings with the following environment variables:
> - `EUTELO_DOCS_ROOT`: Path to the documentation root directory (overrides `docsRoot` in the configuration file)
> - `EUTELO_TEMPLATE_ROOT`: Path to the template root directory (overrides preset templates)

### `eutelo init`

Initializes the Eutelo documentation structure in your project.

```bash
pnpm exec eutelo init
pnpm exec eutelo init --dry-run  # Preview without creating directories
```

**Options:**
- `--dry-run`: Preview directories without creating them
- `--config <path>`: Specify a custom config file path
- `--skip-dynamic-paths`: Skip creating directories with dynamic paths (e.g., `{FEATURE}`)
- `--create-placeholders`: Create placeholder directories for dynamic paths (default: enabled)

> **Note:** The `--placeholder-format` option has been removed. Placeholder format is now fixed to `__VARIABLE__`.

**Custom Directory Structure:**

You can customize the directory structure by defining `directoryStructure` in your config file:

```typescript
// eutelo.config.ts
export default {
  docsRoot: 'docs',
  directoryStructure: {
    'product': [],
    'product/features/{FEATURE}': [
      { file: 'PRD-{FEATURE}.md', template: 'templates/prd.md' }
    ],
    'architecture': [],
    'architecture/design/{FEATURE}': [
      { file: 'DSG-{FEATURE}.md', template: 'templates/dsg.md' }
    ]
  }
};
```

When `directoryStructure` is not specified, the default structure is used.

### `eutelo add`

Generates documents from templates.

#### Built-in Document Types (Deprecated)

> **Warning:** Built-in document types (`prd`, `beh`, `sub-prd`, `sub-beh`, `dsg`, `adr`, `task`, `ops`) are deprecated.  
> Please define custom document types in `eutelo.config.*` and use `eutelo add <kind>` instead.  
> See [Migration Guide](docs/product/tasks/MIGRATION-GUIDE-EUTELO-FEATURE-SIMPLIFICATION.md) for details.

```bash
# Generate a PRD (Product Requirements Document)
pnpm exec eutelo add prd <feature>  # Deprecated: Use custom document types instead

# Generate a BEH (Behavior Specification)
pnpm exec eutelo add beh <feature>  # Deprecated: Use custom document types instead

# Generate a SUB-PRD (Sub Product Requirements Document)
pnpm exec eutelo add sub-prd <feature> <sub>  # Deprecated: Use custom document types instead

# Generate a SUB-BEH (Sub Behavior Specification)
pnpm exec eutelo add sub-beh <feature> <sub>  # Deprecated: Use custom document types instead

# Generate a DSG (Design Specification)
pnpm exec eutelo add dsg <feature>  # Deprecated: Use custom document types instead

# Generate an ADR (Architecture Decision Record)
pnpm exec eutelo add adr <feature>  # Deprecated: Use custom document types instead

# Generate a TASK (Task Plan)
pnpm exec eutelo add task <name>  # Deprecated: Use custom document types instead

# Generate an OPS (Operations Runbook)
pnpm exec eutelo add ops <name>  # Deprecated: Use custom document types instead
```

#### Custom Document Types

Eutelo supports custom document types defined in your configuration. When you define a scaffold entry with a `kind` in your `eutelo.config.*`, it automatically becomes available as a CLI command.

**Example: Adding a Custom Document Type**

1. **Create a template file** (e.g., `templates/_template-custom.md`):
```markdown
---
id: CUSTOM-{FEATURE}
type: custom
feature: {FEATURE}
---

# Custom Document: {FEATURE}
```

2. **Define the scaffold entry** in `eutelo.config.ts`:
```typescript
export default defineConfig({
  scaffold: {
    'document.custom': {
      id: 'document.custom',
      kind: 'custom',
      path: 'custom/{FEATURE}/CUSTOM-{FEATURE}.md',
      template: '_template-custom.md',
      variables: {
        ID: 'CUSTOM-{FEATURE}',
        PARENT: 'PRD-{FEATURE}'
      },
      frontmatterDefaults: {
        type: 'custom',
        parent: '{PARENT}'
      }
    }
  },
  frontmatter: {
    schemas: [
      {
        kind: 'custom',
        fields: {
          id: { type: 'string', required: true },
          type: { type: 'string', required: true },
          feature: { type: 'string', required: true }
        }
      }
    ]
  }
});
```

3. **Use the custom command**:
```bash
pnpm exec eutelo add custom <feature>
```

The command `eutelo add custom <feature>` is automatically generated based on the scaffold configuration. The command arguments are determined by the placeholders used in the scaffold's `path` and `variables`:
- `{FEATURE}` → requires `<feature>` argument
- `{SUB}` → requires `<sub>` argument
- `{NAME}` → requires `<name>` argument

**Note**: Unknown document types (not defined in configuration) will generate warnings but won't cause validation errors.

### `eutelo align`

Checks document consistency across related documents.

**Environment Variable Configuration**

To use the `eutelo align` command, you need to set the following environment variables. You can set them using either of the following methods:

1. **Using `.env` file (Recommended)**
   
   Create a `.env` file in the project root and set the following variables:

   ```bash
   EUTELO_GUARD_API_ENDPOINT=https://api.openai.com
   EUTELO_GUARD_API_KEY=your-api-key-here
   EUTELO_GUARD_MODEL=gpt-4o-mini
   EUTELO_GUARD_DEBUG=false
   ```

   You can copy the `.env.example` file to create `.env`:

   ```bash
   cp .env.example .env
   # Edit the .env file to set your API key
   ```

2. **Set environment variables directly**

   ```bash
   export EUTELO_GUARD_API_ENDPOINT=https://api.openai.com
   export EUTELO_GUARD_API_KEY=your-api-key-here
   export EUTELO_GUARD_MODEL=gpt-4o-mini
   pnpm exec eutelo align
   ```

**Usage**

```bash
pnpm exec eutelo align                           # Run consistency checks
pnpm exec eutelo align docs/**/*.md             # Check specified documents
pnpm exec eutelo align --format json             # Output in JSON format
pnpm exec eutelo align --warn-only               # Don't exit with code 2 even on errors
pnpm exec eutelo align --fail-on-error           # Exit with code 2 when issues are detected (default)
pnpm exec eutelo align --check <id>              # Execute a specific guard prompt ID
# Even when switching presets, the configuration is resolved and UseCase is called once
# Guard prompts are loaded from config.guard.prompts, so execution is not possible without a preset
```

**Related Document Auto-Collection**

When running `eutelo align`, related documents (parent, children, related documents) are automatically collected based on the document graph. This enables cross-document consistency checks with just a single document specified.

```bash
# Automatically collect related documents (default behavior)
pnpm exec eutelo align docs/product/features/AUTH/PRD-AUTH.md

# Disable related document collection (check only the specified document)
pnpm exec eutelo align --no-related docs/product/features/AUTH/PRD-AUTH.md

# Specify traversal depth (default: 1)
pnpm exec eutelo align --depth=2 docs/product/features/AUTH/PRD-AUTH.md

# Collect all related documents regardless of depth
pnpm exec eutelo align --all docs/product/features/AUTH/PRD-AUTH.md
```

**Options:**
- `--with-related`: Enable related document collection (default)
- `--no-related`: Disable related document collection
- `--depth <n>`: Set traversal depth for related document collection (default: 1)
- `--all`: Collect all related documents regardless of depth (max: 100 documents)

### `eutelo rule`

Validates individual documents against user-defined rules using LLM-based validation.

**Overview**

The `eutelo rule` command validates documents against rules defined in Markdown rule files. Unlike `eutelo align` (which checks inter-document consistency) and `eutelo lint` (which checks static Eutelo rules), `eutelo rule` focuses on validating individual documents against custom rules you define.

**Environment Variable Configuration**

To use the `eutelo rule` command, you need to set the following environment variables (same as `eutelo align`):

1. **Using `.env` file (Recommended)**

   Create a `.env` file in the project root:

   ```bash
   EUTELO_GUARD_API_ENDPOINT=https://api.openai.com
   EUTELO_GUARD_API_KEY=your-api-key-here
   EUTELO_GUARD_MODEL=gpt-4o-mini
   ```

2. **Set environment variables directly**

   ```bash
   export EUTELO_GUARD_API_ENDPOINT=https://api.openai.com
   export EUTELO_GUARD_API_KEY=your-api-key-here
   export EUTELO_GUARD_MODEL=gpt-4o-mini
   pnpm exec eutelo rule
   ```

**Configuration**

Rule files are specified in `directoryStructure` using the `rules` field:

```typescript
// eutelo.config.ts
export default {
  directoryStructure: {
    'product/features/{FEATURE}': [
      {
        file: 'PRD-{FEATURE}.md',
        kind: 'prd',
        template: 'templates/prd.md',
        rules: 'rules/prd-validation.md'  // Rule file path
      }
    ]
  }
};
```

Rule file paths can be:
- **Relative to project root**: `rules/prd-validation.md`
- **Relative to config file**: `./rules/prd-validation.md`
- **Absolute paths**: `/path/to/rules/prd-validation.md`

**Rule File Format**

Rule files are Markdown files with YAML frontmatter:

```markdown
---
version: "1.0"
description: "PRD Validation Rules"
validationMode: "llm"  # Required: "llm" for LLM-based validation
---

## Frontmatter Rules

### Required Fields
- `purpose`: Required. Must not be empty
- `type`: Required. Value must be `prd`

### Field Format
- `id`: Required. Format: `PRD-{FEATURE}`
- `status`: Required. Value must be one of: `draft`, `review`, `approved`

## Structure Rules

### Section Requirements
- `## Purpose` section must exist
- `## Background` section must exist

## Content Rules

### Quality Guidelines
- Purpose section should be clear and specific
- Background should explain the problem context
```

**Usage**

```bash
# Validate specific documents
pnpm exec eutelo rule docs/product/features/AUTH/PRD-AUTH.md

# Validate multiple documents
pnpm exec eutelo rule docs/**/*.md

# Output in JSON format
pnpm exec eutelo rule --format=json docs/**/*.md

# CI mode (automatically uses JSON format and fail-on-error)
pnpm exec eutelo rule --ci docs/**/*.md

# Warn only (don't exit with code 1 for rule violations)
pnpm exec eutelo rule --warn-only docs/**/*.md
```

**Options:**
- `[documents...]`: Document paths to validate (if omitted, validates all documents with rules)
- `--format <format>`: Output format (`text` or `json`, default: `text`)
- `--fail-on-error`: Exit with code 1 when rule violations are detected (default: enabled)
- `--warn-only`: Never exit with code 1, even when rule violations are detected
- `--ci`: CI mode (enables `--format=json` and `--fail-on-error`)
- `--config <path>`: Path to custom config file

**Exit Codes:**
- `0`: Validation successful (no rule violations)
- `1`: Rule violations detected (errors or warnings)
- `2`: System error (rule file not found, syntax error, LLM configuration missing, etc.)

**How It Works**

1. For each document, `eutelo rule` looks up the corresponding rule file from `directoryStructure.rules`
2. If a rule file is found, it loads the rule file and composes a prompt combining:
   - Common Eutelo system instructions
   - Eutelo standard rules
   - User-defined rules from the rule file
   - The document content
3. The composed prompt is sent to the LLM for validation
4. The LLM response is parsed and rule violations are reported

**Note**: Documents without a `rules` field in their `directoryStructure` definition are skipped during validation.

## Migration Guide

For information about removed features and migration steps, see [Migration Guide](docs/product/tasks/MIGRATION-GUIDE-EUTELO-FEATURE-SIMPLIFICATION.md).

## For Developers

For commands and procedures used for development of this repository, see [Documentation for Developers](DEVELOPERS.md).

## Running align in CI

Eutelo provides reusable workflows and Composite Actions for running `eutelo align` in GitHub Actions. If you want to introduce it with minimal configuration, choose one of the following:

### Call Reusable Workflow

Call `.github/workflows/guard.yml` with `workflow_call` and pass the required secrets.

```yaml
name: Guard

on:
  pull_request:
  push:

jobs:
  guard:
    uses: ./.github/workflows/guard.yml
    secrets:
      EUTELO_GUARD_API_ENDPOINT: ${{ secrets.EUTELO_GUARD_API_ENDPOINT }}
      EUTELO_GUARD_API_KEY: ${{ secrets.EUTELO_GUARD_API_KEY }}
    with:
      # Override as needed
      paths: docs/**/*.md
      working-directory: .
      format: text
```

### Use Composite Action Directly

You can also call `.github/actions/guard` as a step within your own workflow. Set API information in `env` and override inputs with `with`.

```yaml
jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/guard
        env:
          EUTELO_GUARD_API_ENDPOINT: ${{ secrets.EUTELO_GUARD_API_ENDPOINT }}
          EUTELO_GUARD_API_KEY: ${{ secrets.EUTELO_GUARD_API_KEY }}
        with:
          paths: docs/**/*.md
          working-directory: .
          format: text
```

### Templates

Ready-to-use templates for PR/main/manual execution are located under `packages/distribution/examples/ci/`. Copy them to your repository and override secrets and `working-directory` as needed.

### CI Execution Points
- In workflows, we recommend `npm ci` + `npx eutelo align ...` instead of global installation (same as this repository's `.github/workflows/guard.yml`).
- Pass LLM environment variables via Secrets/Vars; workflows don't need to change even when presets or local configurations are swapped.
