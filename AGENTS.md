# Repository Guidelines

## Project Structure & Module Organization
This is a TypeScript monorepo managed through npm workspaces (see `package.json`). Each domain lives under `packages/<module>` with mirrored `src/`, `tests/`, and generated `dist/` folders; `core` houses shared logic, `cli` wires the executable, `commander` contains orchestration helpers, `distribution` stores templates/examples, and `infrastructure` integrates external services. Cross-cutting type declarations live in `/types`, while supplementary docs sit under `/docs`. Build settings are centralized in `tsconfig.base.json`, so new modules should extend those defaults instead of redefining compiler options.

## Build, Test, and Development Commands
Run `mise install` or `mise use` to ensure Node 18, then `npm install` at repo root. `npm run build` executes `tsc -b` across all workspaces producing `dist/` outputs. `npm test` builds first, then invokes Node’s test runner (`node --test`) so it behaves like CI. Use `npm run clean` to remove stale bundle artifacts in every package. During package-specific work, `npx tsc -w -p packages/<module>` gives incremental builds, and `node --test packages/<module>/tests/**/*.test.ts` executes only the relevant suite.

## Coding Style & Naming Conventions
All runtime code is ECMAScript modules; prefer `import`/`export` syntax and avoid CommonJS. Keep TypeScript strict (follow `tsconfig.base`) with 2-space indentation, `camelCase` for variables/functions, `PascalCase` for exported classes/types, and kebab-case for file names (e.g., `packages/core/src/agent-registry.ts`). Co-locate helper modules next to the features they serve and organize public entrypoints via `index.ts` barrels. Before pushing, ensure `tsc -b` is clean—type errors gate merges more reliably than runtime checks.

## Testing Guidelines
Tests reside in each package’s `tests/` directory and should mirror the `src/` structure (e.g., `src/agents/scheduler.ts` → `tests/agents/scheduler.test.ts`). Use Node’s built-in test runner with descriptive `test()` names and table-driven data where possible. Aim to cover new CLI flags, distribution templates, and infrastructure adapters end-to-end, and add regression cases whenever touching shared abstractions in `core`. Run `npm test` before every PR to match CI, and use focused commands for quick iteration locally.

## Commit & Pull Request Guidelines
Follow an imperative subject line with optional scope (e.g., `feat(cli): add profile flag`). Limit the first line to 72 characters, add meaningful body paragraphs for nuanced changes, and reference issue IDs when applicable. Pull requests should summarize the motivation, list key changes, include testing evidence (command outputs or screenshots for CLI UX), and mention follow-up work. Keep diffs minimal—split refactors from feature work to ease review and reduce the risk of regressions.
