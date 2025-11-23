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

## タスク実行時のルール
** {タスクリスト}に着手してください ** などの依頼があった際に必ず守らなければいけない原則です。これを破ることはユーザーからの信頼を著しく損なう結果となりますので、細心の注意を払ってください。
- タスク実行中の思考は英語で行うこと。ただし、報告時は必ず日本語でタスクの進捗状況を報告すること。またタスクリストのマークダウンファイルを渡されている場合はTODOリストのチェック&アップデートしてから報告してください。
- タスクリストには基本的にはTODOリストが記載されています。依存関係に注意しながらTODOリストを順番に消化していくのがあなたの責務です。
- 報告時にはユーザーがわかりやすいように元のタスクリストのTODOリストを[]から[x]にチェックをいれることで表現してください。それ以外に過度にタスクリストに追記することはユーザーを混乱させ、不要な実装が紛れ込む原因になるため注意してください。
- タスクリストに記載されていない実装は絶対に行わないこと。万一よりよいプロダクトのための追加実装が必要であった場合も必ずユーザーの確認をとること。許可なしに追加で実装などを進めた場合はユーザーから厳しく叱責されることを覚悟するように。
- タスクの進捗報告と一部のallowlist外のコマンド実行以外の繰り返された質問やタスクリストが進んでいない報告でのチャット停止はあなたの評価を毀損することを認識してください。円滑な開発を進めるために、かならずタスクリストのチェックが一つでも進んでから報告をしてください。
