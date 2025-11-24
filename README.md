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
