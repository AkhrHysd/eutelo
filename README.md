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
        PARENT: 'PRINCIPLE-GLOBAL'
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

#### `scaffold` (optional)
Object mapping scaffold IDs to template configurations:
- `id`: Unique identifier for the scaffold entry
- `kind`: Document kind (e.g., `'prd'`, `'beh'`, `'adr'`)
- `path`: File path pattern with placeholders (e.g., `{FEATURE}`, `{SUB}`)
- `template`: Template file path (relative to preset template root or project root)
- `variables`: Optional variables to inject into templates

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

You can inspect the merged configuration using:
```bash
pnpm exec eutelo config inspect
```

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
npx eutelo check --format=json
npx eutelo guard docs/**/*.md --warn-only
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

### `eutelo add`

Generates documents from templates.

```bash
# Generate a PRD (Product Requirements Document)
pnpm exec eutelo add prd <feature>

# Generate a BEH (Behavior Specification)
pnpm exec eutelo add beh <feature>

# Generate a SUB-PRD (Sub Product Requirements Document)
pnpm exec eutelo add sub-prd <feature> <sub>

# Generate a SUB-BEH (Sub Behavior Specification)
pnpm exec eutelo add sub-beh <feature> <sub>

# Generate a DSG (Design Specification)
pnpm exec eutelo add dsg <feature>

# Generate an ADR (Architecture Decision Record)
pnpm exec eutelo add adr <feature>

# Generate a TASK (Task Plan)
pnpm exec eutelo add task <name>

# Generate an OPS (Operations Runbook)
pnpm exec eutelo add ops <name>
```

### `eutelo lint`

Runs linting on documentation files.

```bash
pnpm exec eutelo lint                    # Lint all documents
pnpm exec eutelo lint docs/**/*.md       # Lint specified paths
pnpm exec eutelo lint --format json      # Output in JSON format
```

### `eutelo sync`

Generates missing documentation artifacts based on the current structure.

```bash
pnpm exec eutelo sync                    # Generate missing documents
pnpm exec eutelo sync --check-only       # Report only without generating
```

### `eutelo check`

Validates Eutelo documentation structure and frontmatter consistency.

```bash
pnpm exec eutelo check                   # Validate structure and frontmatter
pnpm exec eutelo check --format json     # Output in JSON format
pnpm exec eutelo check --ci              # CI-friendly JSON output
```

### `eutelo guard`

Runs experimental document guard consistency checks.

**Environment Variable Configuration**

To use the `eutelo guard` command, you need to set the following environment variables. You can set them using either of the following methods:

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
   pnpm exec eutelo guard
   ```

**Usage**

```bash
pnpm exec eutelo guard                           # Run guard checks
pnpm exec eutelo guard docs/**/*.md             # Check specified documents
pnpm exec eutelo guard --format json             # Output in JSON format
pnpm exec eutelo guard --warn-only               # Don't exit with code 2 even on errors
pnpm exec eutelo guard --fail-on-error           # Exit with code 2 when issues are detected (default)
pnpm exec eutelo guard --check <id>              # Execute a specific guard prompt ID
# Even when switching presets, the configuration is resolved and UseCase is called once
# Guard prompts are loaded from config.guard.prompts, so execution is not possible without a preset
```

### `eutelo graph`

Operates and analyzes the dependency graph between documents.

#### `eutelo graph build`

Builds and outputs the document graph.

```bash
pnpm exec eutelo graph build                    # Output graph in JSON format
pnpm exec eutelo graph build --format mermaid   # Output in Mermaid format
pnpm exec eutelo graph build --output graph.json # Write to file
```

#### `eutelo graph show <documentId>`

Displays parent-child relationships and related nodes for a specified document.

```bash
pnpm exec eutelo graph show <documentId>        # Display document relationships
```

#### `eutelo graph impact <documentId>`

Analyzes the impact scope (1-hop / 2-hop dependencies) of a specified document.

```bash
pnpm exec eutelo graph impact <documentId>      # Analyze impact scope
pnpm exec eutelo graph impact <documentId> --depth 5  # Specify search depth (default: 3)
```

#### `eutelo graph summary`

Displays graph-wide statistics (node count, edge count, orphan nodes, etc.).

```bash
pnpm exec eutelo graph summary                  # Display graph statistics
```

### `eutelo config inspect`

Resolves `eutelo.config.*` and presets, showing the merged configuration.

```bash
pnpm exec eutelo config inspect                         # Resolve configuration at project root
pnpm exec eutelo config inspect --config ./eutelo.config.yaml
pnpm exec eutelo config inspect --format json           # Output in JSON format
```

## For Developers

For commands and procedures used for development of this repository, see [Documentation for Developers](DEVELOPERS.md).

## Running guard in CI

Eutelo provides reusable workflows and Composite Actions for running `eutelo guard` in GitHub Actions. If you want to introduce it with minimal configuration, choose one of the following:

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
- In workflows, we recommend `npm ci` + `npx eutelo guard ...` instead of global installation (same as this repository's `.github/workflows/guard.yml`).
- Pass LLM environment variables via Secrets/Vars; workflows don't need to change even when presets or local configurations are swapped.
