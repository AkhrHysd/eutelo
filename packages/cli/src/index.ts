import { Command } from 'commander';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  FileAlreadyExistsError,
  TemplateNotFoundError,
  TemplateService,
  createAddDocumentService,
  createScaffoldService,
  createValidationService,
  createGuardService,
  type DocumentType,
  type SyncOptions,
  CHECK_EXIT_CODES,
  GUARD_EXIT_CODES,
  type GuardRunResult,
  type GuardOutputFormat,
  RuleEngine,
  resolveDocsRoot
} from '@eutelo/core';
import { FileSystemAdapter } from '@eutelo/infrastructure';

type InitCliOptions = {
  dryRun?: boolean;
};

type AddParams = {
  feature?: string;
  sub?: string;
  name?: string;
};

type SyncCliOptions = Pick<SyncOptions, 'checkOnly'>;

type CheckCliOptions = {
  format?: string;
  ci?: boolean;
};

type LintCliOptions = {
  format?: string;
  paths?: string[];
};

type GuardCliOptions = {
  format?: string;
  failOnError?: boolean;
  warnOnly?: boolean;
};

function formatList(items: string[]): string {
  return items.map((item) => `  - ${item}`).join('\n');
}

function resolveTemplateRoot(): string {
  const override = process.env.EUTELO_TEMPLATE_ROOT;
  if (override && override.trim().length > 0) {
    return path.resolve(process.cwd(), override);
  }
  const require = createRequire(import.meta.url);
  const distributionPath = require.resolve('@eutelo/distribution/package.json');
  return path.join(path.dirname(distributionPath), 'templates');
}

async function runInitCommand(scaffoldService: ReturnType<typeof createScaffoldService>, options: InitCliOptions) {
  const dryRun = Boolean(options.dryRun);
  const result = await scaffoldService.init({ cwd: process.cwd(), dryRun });

  if (dryRun) {
    process.stdout.write('Dry run: the following directories would be created:\n');
  } else {
    process.stdout.write('Initializing Eutelo documentation structure...\n');
  }

  if (result.created.length === 0) {
    process.stdout.write('  No directories need to be created.\n');
  } else {
    process.stdout.write(`${formatList(result.created)}\n`);
  }

  if (result.skipped.length > 0) {
    process.stdout.write('Skipped (already existed):\n');
    process.stdout.write(`${formatList(result.skipped)}\n`);
  }
}

async function executeAddDocument(
  service: ReturnType<typeof createAddDocumentService>,
  type: DocumentType,
  params: AddParams
) {
  const result = await service.addDocument({ cwd: process.cwd(), type, ...params });
  process.stdout.write(`Created ${result.relativePath}\n`);
}

async function runSyncCommand(scaffoldService: ReturnType<typeof createScaffoldService>, options: SyncCliOptions) {
  const result = await scaffoldService.sync({ cwd: process.cwd(), checkOnly: Boolean(options.checkOnly) });

  if (result.plan.length === 0) {
    process.stdout.write('No changes. All documents are up to date.\n');
    return;
  }

  const paths = result.plan.map((entry) => entry.relativePath);
  if (options.checkOnly) {
    process.stdout.write('Missing documents detected:\n');
    process.stdout.write(`${formatList(paths)}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write('Generated documents:\n');
    process.stdout.write(`${formatList(paths)}\n`);
  }
}

async function runCheckCommand(
  validationService: ReturnType<typeof createValidationService>,
  options: CheckCliOptions,
  argv: string[]
) {
  const formatOverride = resolveFormatArgument(argv);
  const normalizedFormat = (formatOverride ?? 'text').toLowerCase();
  const useJson = normalizedFormat === 'json' || Boolean(options.ci);
  const report = await validationService.runChecks({ cwd: process.cwd() });
  const hasIssues = report.issues.length > 0;

  if (useJson) {
    const indent = options.ci ? 0 : 2;
    process.stdout.write(`${JSON.stringify(report, null, indent)}\n`);
  } else {
    if (!hasIssues) {
      process.stdout.write('No issues found. Documentation structure looks good.\n');
    } else {
      process.stdout.write(`Found ${report.issues.length} issue(s):\n`);
      for (const issue of report.issues) {
        process.stdout.write(`- [${issue.type}] ${issue.path}: ${issue.message}\n`);
      }
    }
  }

  process.exitCode = hasIssues ? CHECK_EXIT_CODES.VALIDATION_ERROR : CHECK_EXIT_CODES.SUCCESS;
}

async function collectMarkdownFiles(root: string, adapter: FileSystemAdapter, accumulator: string[] = []): Promise<string[]> {
  const entries = await adapter.readDir(root);
  for (const entry of entries) {
    const entryPath = path.join(root, entry);
    const stats = await adapter.stat(entryPath);
    if (stats.isDirectory()) {
      await collectMarkdownFiles(entryPath, adapter, accumulator);
    } else if (stats.isFile() && entry.toLowerCase().endsWith('.md')) {
      accumulator.push(entryPath);
    }
  }
  return accumulator.sort((a, b) => a.localeCompare(b));
}

function determineLintFormat(argv: string[], options: LintCliOptions): 'json' | 'text' {
  const override = resolveFormatArgument(argv) ?? options.format;
  if (!override) return 'text';
  const normalized = override.toLowerCase();
  return normalized === 'json' ? 'json' : 'text';
}

async function runLintCommand(
  ruleEngine: RuleEngine,
  fileSystemAdapter: FileSystemAdapter,
  options: LintCliOptions,
  argv: string[] = process.argv
) {
  const docsRoot = path.resolve(process.cwd(), resolveDocsRoot());
  const targetPaths =
    options.paths && options.paths.length > 0
      ? options.paths.map((entry) => path.resolve(process.cwd(), entry))
      : await collectMarkdownFiles(docsRoot, fileSystemAdapter);

  const results = [];
  for (const filePath of targetPaths) {
    const content = await fileSystemAdapter.readFile(filePath);
    const { issues } = await ruleEngine.lint({ content, filePath });
    results.push({ path: filePath, issues });
  }

  const hasErrors = results.some((result) => result.issues.some((issue) => issue.severity === 'error'));
  const format = determineLintFormat(argv, options);

  if (format === 'json') {
    process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
  } else {
    if (!hasErrors && results.every((entry) => entry.issues.length === 0)) {
      process.stdout.write('No lint issues found.\n');
    } else {
      for (const result of results) {
        if (result.issues.length === 0) continue;
        process.stdout.write(`${result.path}\n`);
        for (const issue of result.issues) {
          process.stdout.write(`  - ${issue.severity.toUpperCase()}: ${issue.message}\n`);
        }
      }
    }
  }

  process.exitCode = hasErrors ? 1 : 0;
}

async function runGuardCommand(
  guardService: ReturnType<typeof createGuardService>,
  documents: string[],
  options: GuardCliOptions = {},
  argv: string[] = []
) {
  const normalizedDocuments = normalizeGuardDocuments(documents, argv);
  const formatOverride = resolveFormatArgument(argv);
  const format = normalizeGuardFormat(formatOverride ?? options.format);
  const warnOnly = Boolean(options.warnOnly);
  const failOnError = warnOnly ? false : options.failOnError ?? true;
  const result = await guardService.run({
    documents: normalizedDocuments,
    format,
    warnOnly,
    failOnError
  });

  renderGuardResult(result, format);
  process.exitCode = determineGuardExitCode(result, { warnOnly, failOnError });
}

function handleCommandError(error: unknown): void {
  if (error instanceof FileAlreadyExistsError) {
    process.stderr.write(`Error: File already exists at ${error.filePath}\n`);
  } else if (error instanceof TemplateNotFoundError) {
    process.stderr.write(`Error: Template not found (${error.templateName})\n`);
  } else if (error instanceof Error) {
    process.stderr.write(`Error: ${error.message}\n`);
  } else {
    process.stderr.write('Error: Unknown error\n');
  }
  process.exitCode = 1;
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const fileSystemAdapter = new FileSystemAdapter();
  const templateService = new TemplateService({ templateRoot: resolveTemplateRoot() });
  const scaffoldService = createScaffoldService({ fileSystemAdapter, templateService });
  const addDocumentService = createAddDocumentService({ fileSystemAdapter, templateService });
  const validationService = createValidationService({ fileSystemAdapter });
  const guardService = createGuardService();
  const ruleEngine = new RuleEngine({ docsRoot: resolveDocsRoot() });

  const program = new Command();
  program.name('eutelo').description('Eutelo documentation toolkit');

  program
    .command('init')
    .description('Initialize the eutelo-docs structure in the current directory')
    .option('--dry-run', 'Show directories without writing to disk')
    .action(async (options: InitCliOptions) => {
      try {
        await runInitCommand(scaffoldService, options);
      } catch (error) {
        handleCommandError(error);
      }
    });

  const add = program.command('add').description('Generate documentation from templates');

  program
    .command('lint [paths...]')
    .description('Run doc-lint across documentation files')
    .option('--format <format>', 'Output format (text or json)')
    .action(async (paths: string[], options: LintCliOptions) => {
      try {
        await runLintCommand(ruleEngine, fileSystemAdapter, { ...options, paths });
      } catch (error) {
        handleCommandError(error);
      }
    });

  add
    .command('prd <feature>')
    .description('Generate a PRD document for the given feature')
    .action(async (feature: string) => {
      try {
        await executeAddDocument(addDocumentService, 'prd', { feature });
      } catch (error) {
        handleCommandError(error);
      }
    });

  add
    .command('beh <feature>')
    .description('Generate a BEH document for the given feature')
    .action(async (feature: string) => {
      try {
        await executeAddDocument(addDocumentService, 'beh', { feature });
      } catch (error) {
        handleCommandError(error);
      }
    });

  add
    .command('sub-prd <feature> <sub>')
    .description('Generate a SUB-PRD document for the given feature and sub-feature')
    .action(async (feature: string, sub: string) => {
      try {
        await executeAddDocument(addDocumentService, 'sub-prd', { feature, sub });
      } catch (error) {
        handleCommandError(error);
      }
    });

  add
    .command('sub-beh <feature> <sub>')
    .description('Generate a sub BEH document linked to a SUB-PRD')
    .action(async (feature: string, sub: string) => {
      try {
        await executeAddDocument(addDocumentService, 'sub-beh', { feature, sub });
      } catch (error) {
        handleCommandError(error);
      }
    });

  add
    .command('dsg <feature>')
    .description('Generate a DSG document for the given feature')
    .action(async (feature: string) => {
      try {
        await executeAddDocument(addDocumentService, 'dsg', { feature });
      } catch (error) {
        handleCommandError(error);
      }
    });

  add
    .command('adr <feature>')
    .description('Generate an ADR document for the given feature with sequential numbering')
    .action(async (feature: string) => {
      try {
        await executeAddDocument(addDocumentService, 'adr', { feature });
      } catch (error) {
        handleCommandError(error);
      }
    });

  add
    .command('task <name>')
    .description('Generate a TASK plan document')
    .action(async (name: string) => {
      try {
        await executeAddDocument(addDocumentService, 'task', { name });
      } catch (error) {
        handleCommandError(error);
      }
    });

  add
    .command('ops <name>')
    .description('Generate an OPS runbook document')
    .action(async (name: string) => {
      try {
        await executeAddDocument(addDocumentService, 'ops', { name });
      } catch (error) {
        handleCommandError(error);
      }
    });

  program
    .command('sync')
    .description('Generate any missing documentation artifacts based on the current structure')
    .option('--check-only', 'Report missing documents without writing to disk')
    .action(async (options: SyncCliOptions) => {
      try {
        await runSyncCommand(scaffoldService, options);
      } catch (error) {
        handleCommandError(error);
      }
    });

  program
    .command('check')
    .description('Validate eutelo-docs structure and frontmatter consistency')
    .option('--format <format>', 'Output format: text or json')
    .option('--ci', 'Emit CI-friendly JSON output')
    .action(async (options: CheckCliOptions) => {
      try {
        await runCheckCommand(validationService, options, argv);
      } catch (error) {
        handleCommandError(error);
        process.exitCode = CHECK_EXIT_CODES.ERROR;
      }
    });

  program
    .command('guard [documents...]')
    .description('Run the experimental document guard consistency checks')
    .option('--format <format>', 'Output format (text or json)')
    .option('--fail-on-error', 'Exit with code 2 when issues are detected (default)')
    .option('--warn-only', 'Never exit with code 2, even when issues are detected')
    .action(async (options: GuardCliOptions = {}) => {
      try {
        await runGuardCommand(guardService, [], options, argv);
      } catch (error) {
        handleCommandError(error);
      }
    });

  await program.parseAsync(argv);
}

function resolveFormatArgument(argv: string[]): string | undefined {
  if (!Array.isArray(argv)) {
    return undefined;
  }
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    if (token.startsWith('--format=')) {
      const [, value] = token.split('=');
      return value;
    }
    if (token === '--format' && index + 1 < argv.length) {
      const next = argv[index + 1];
      if (next && !next.startsWith('--')) {
        return next;
      }
    }
  }
  return undefined;
}

type GuardExitIntent = {
  warnOnly: boolean;
  failOnError: boolean;
};

function determineGuardExitCode(result: GuardRunResult, intent: GuardExitIntent): number {
  if (result.error) {
    return GUARD_EXIT_CODES.EXECUTION_ERROR;
  }
  if (intent.warnOnly) {
    return GUARD_EXIT_CODES.SUCCESS;
  }
  const hasIssues = Array.isArray(result.issues) && result.issues.length > 0;
  if (hasIssues && intent.failOnError) {
    return GUARD_EXIT_CODES.ISSUES_FOUND;
  }
  return GUARD_EXIT_CODES.SUCCESS;
}

function normalizeGuardFormat(value?: string | boolean): GuardOutputFormat {
  if (!value || typeof value !== 'string') {
    return 'text';
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'text' || normalized === 'json') {
    return normalized;
  }
  throw new Error(`Invalid --format value: ${value}`);
}

function renderGuardResult(result: GuardRunResult, format: GuardOutputFormat): void {
  if (format === 'json') {
    const payload = {
      summary: result.summary,
      stats: {
        issues: result.issues.length,
        warnings: result.warnings.length,
        suggestions: result.suggestions.length
      },
      issues: result.issues,
      warnings: result.warnings,
      suggestions: result.suggestions,
      error: result.error ?? null
    };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${result.summary}\n`);
  if (result.error) {
    process.stdout.write(`Error: ${result.error.message}\n`);
    return;
  }
  if (result.issues.length > 0) {
    process.stdout.write('Issues:\n');
    for (const issue of result.issues) {
      process.stdout.write(formatFinding(issue));
    }
  }
  if (result.warnings.length > 0) {
    process.stdout.write('Warnings:\n');
    for (const warning of result.warnings) {
      process.stdout.write(formatFinding(warning));
    }
  }
  if (result.suggestions.length > 0) {
    process.stdout.write('Suggestions:\n');
    for (const suggestion of result.suggestions) {
      process.stdout.write(formatFinding(suggestion));
    }
  }
}

function formatFinding(entry: GuardRunResult['issues'][number]): string {
  const doc = entry.document ? `${entry.document}: ` : '';
  return `- ${doc}${entry.message}\n`;
}

function normalizeGuardDocuments(positional: string[], argv: string[]): string[] {
  if (Array.isArray(positional) && positional.length > 0) {
    return positional
      .filter((doc) => typeof doc === 'string')
      .map((doc) => doc.trim())
      .filter((doc) => doc.length > 0);
  }

  const guardIndex = Array.isArray(argv) ? argv.indexOf('guard') : -1;
  if (guardIndex === -1) {
    return [];
  }
  const collected: string[] = [];
  let skipNext = false;
  let readEverything = false;
  for (const token of argv.slice(guardIndex + 1)) {
    if (!readEverything && token === '--') {
      readEverything = true;
      continue;
    }
    if (!readEverything && token === '--format') {
      skipNext = true;
      continue;
    }
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (!readEverything && token.startsWith('--')) {
      continue;
    }
    const normalized = token.trim();
    if (normalized.length > 0) {
      collected.push(normalized);
    }
  }
  return collected;
}
