import { Command } from '@eutelo/commander';
import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { config } from 'dotenv';
import {
  FileAlreadyExistsError,
  TemplateNotFoundError,
  TemplateService,
  createAddDocumentService,
  createScaffoldService,
  createValidationService,
  createGuardService,
  createGraphService,
  GraphSerializer,
  type DocumentType,
  type SyncOptions,
  CHECK_EXIT_CODES,
  GUARD_EXIT_CODES,
  type GuardRunResult,
  type GuardOutputFormat,
  RuleEngine,
  resolveDocsRoot,
  loadConfig,
  ConfigError
} from '@eutelo/core';
import type { EuteloConfigResolved } from '@eutelo/core';
import { FileSystemAdapter } from '@eutelo/infrastructure';

// Load .env file from project root (where CLI is executed)
// This allows users to place .env in their project root directory
// dotenv.config() will silently continue if the file doesn't exist
const projectRoot = process.cwd();
const envPath = path.join(projectRoot, '.env');
config({ path: envPath });

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

type GraphBuildCliOptions = {
  format?: string;
  output?: string;
};

type GraphImpactCliOptions = {
  depth?: string;
};

type ConfigInspectOptions = {
  config?: string;
  format?: string;
};

type ConfigCacheEntry = {
  key: string;
  promise: Promise<EuteloConfigResolved>;
};

const CONFIG_CACHE_AUTO_KEY = '__auto__';
let configCacheEntry: ConfigCacheEntry | null = null;

function resolveConfigCacheKey(configFile?: string): string {
  if (!configFile) {
    return CONFIG_CACHE_AUTO_KEY;
  }
  return path.resolve(process.cwd(), configFile);
}

async function getResolvedConfigCached(configFile?: string): Promise<EuteloConfigResolved> {
  const cacheKey = resolveConfigCacheKey(configFile);
  if (!configCacheEntry || configCacheEntry.key !== cacheKey) {
    const absolutePath = configFile ? cacheKey : undefined;
    configCacheEntry = {
      key: cacheKey,
      promise: loadConfig({ cwd: process.cwd(), configFile: absolutePath })
    };
  }
  return configCacheEntry.promise;
}

async function withConfig<T>(
  configFile: string | undefined,
  fn: (config: EuteloConfigResolved) => Promise<T>
): Promise<T> {
  const config = await getResolvedConfigCached(configFile);
  return fn(config);
}

function resolveDocsRootFromConfig(config: EuteloConfigResolved): string {
  const override = process.env.EUTELO_DOCS_ROOT;
  if (override && override.trim().length > 0) {
    return override.trim();
  }
  return config.docsRoot;
}

function formatList(items: string[]): string {
  return items.map((item) => `  - ${item}`).join('\n');
}

function resolveTemplateRoot(): string {
  const require = createRequire(import.meta.url);
  const presetPath = require.resolve('@eutelo/preset-default/package.json');
  return path.join(path.dirname(presetPath), 'templates');
}

function resolveTemplateOverrideRoot(): string | undefined {
  const override = process.env.EUTELO_TEMPLATE_ROOT;
  if (override && override.trim().length > 0) {
    return path.resolve(process.cwd(), override);
  }
  return undefined;
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
  argv: string[] = process.argv,
  docsRootOverride?: string
) {
  const docsRoot = docsRootOverride
    ? path.resolve(process.cwd(), docsRootOverride)
    : path.resolve(process.cwd(), resolveDocsRoot());
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

async function runConfigInspect(options: ConfigInspectOptions, argv: string[]): Promise<void> {
  const format = normalizeConfigInspectFormat(resolveFormatArgument(argv) ?? options.format);
  const explicitPath = typeof options.config === 'string' ? options.config : undefined;
  const argvPath = resolveOptionValue(argv, '--config');
  const configPath = explicitPath ?? argvPath;
  const absoluteConfigPath = configPath ? path.resolve(process.cwd(), configPath) : undefined;
  const resolved = await loadConfig({
    cwd: process.cwd(),
    configFile: absoluteConfigPath
  });

  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(resolved, null, 2)}\n`);
    return;
  }

  process.stdout.write(renderConfigInspection(resolved));
}

function normalizeConfigInspectFormat(value?: string | boolean): 'text' | 'json' {
  if (!value || typeof value !== 'string') {
    return 'text';
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'json' || normalized === 'text') {
    return normalized;
  }
  throw new Error(`Invalid --format value: ${value}`);
}

function renderConfigInspection(config: EuteloConfigResolved): string {
  const scaffoldEntries = Object.entries(config.scaffold ?? {}).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const guardEntries = Object.entries(config.guard?.prompts ?? {}).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const schemaEntries = [...(config.frontmatter?.schemas ?? [])].sort((a, b) =>
    a.kind.localeCompare(b.kind)
  );

  const lines: string[] = [];
  lines.push(`Config file: ${config.sources.configPath ?? '(auto-detected)'}`);
  lines.push(`Working directory: ${config.sources.cwd}`);
  lines.push('Presets:');
  if (config.presets.length === 0) {
    lines.push('  (none)');
  } else {
    for (const preset of config.presets) {
      lines.push(`  - ${preset}`);
    }
  }

  lines.push('Scaffold entries:');
  if (scaffoldEntries.length === 0) {
    lines.push('  (none)');
  } else {
    for (const [, entry] of scaffoldEntries) {
      lines.push(`  - ${entry.id}: ${entry.path} (template: ${entry.template})`);
    }
  }

  lines.push('Frontmatter schemas:');
  if (schemaEntries.length === 0) {
    lines.push('  (none)');
  } else {
    for (const schema of schemaEntries) {
      lines.push(`  - ${schema.kind}: ${Object.keys(schema.fields).length} field(s)`);
    }
  }

  lines.push('Guard prompts:');
  if (guardEntries.length === 0) {
    lines.push('  (none)');
  } else {
    for (const [, prompt] of guardEntries) {
      const modelSegment = prompt.model ? ` model=${prompt.model}` : '';
      lines.push(`  - ${prompt.id}: ${prompt.templatePath}${modelSegment}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

type GraphOutputFormat = 'json' | 'mermaid';

async function runGraphBuildCommand(
  graphService: ReturnType<typeof createGraphService>,
  argv: string[]
): Promise<void> {
  const format = normalizeGraphFormat(resolveFormatArgument(argv));
  const outputValue = resolveOptionValue(argv, '--output')?.trim();
  const graph = await graphService.buildGraph({ cwd: process.cwd() });
  const payload = GraphSerializer.serialize(graph, format, { maxEdges: 400 });

  const wroteToFile = Boolean(outputValue);
  if (wroteToFile && outputValue) {
    const absoluteOutput = path.resolve(process.cwd(), outputValue);
    await fs.mkdir(path.dirname(absoluteOutput), { recursive: true });
    await fs.writeFile(absoluteOutput, payload);
    process.stdout.write(`Graph exported to ${absoluteOutput}\n`);
  } else {
    process.stdout.write(format === 'json' ? `${payload}\n` : payload);
  }

  renderGraphWarnings(graph.errors);
  const summaryStream = format === 'json' && !wroteToFile ? process.stderr : process.stdout;
  summaryStream.write(`Nodes: ${graph.stats.nodeCount}, edges: ${graph.stats.edgeCount}\n`);
  if (graph.integrity.orphanNodeIds.length > 0) {
    summaryStream.write(`Orphan nodes: ${graph.integrity.orphanNodeIds.slice(0, 5).join(', ')}\n`);
  }
  if (graph.integrity.danglingEdges.length > 0) {
    summaryStream.write(`Dangling edges: ${graph.integrity.danglingEdges.length}\n`);
  }
}

async function runGraphShowCommand(
  graphService: ReturnType<typeof createGraphService>,
  documentId: string
): Promise<void> {
  const result = await graphService.describeNode({ cwd: process.cwd(), documentIdOrPath: documentId });
  process.stdout.write(`Document: ${result.node.id} (${result.node.type})\n`);
  process.stdout.write(`Path: ${result.node.path}\n`);
  if (result.node.feature) {
    process.stdout.write(`Feature: ${result.node.feature}\n`);
  }
  if (result.node.tags.length > 0) {
    process.stdout.write(`Tags: ${result.node.tags.join(', ')}\n`);
  }

  printEdgeList('Parents', result.parents, (edge) => edge.from);
  printEdgeList('Children', result.children, (edge) => edge.to);
  printEdgeList('Related', result.related, (edge) => edge.to);
  printEdgeList('Mentions', result.mentions, (edge) => edge.to);
  printEdgeList('Mentioned By', result.mentionedBy, (edge) => edge.from);
}

async function runGraphImpactCommand(
  graphService: ReturnType<typeof createGraphService>,
  documentId: string,
  argv: string[]
): Promise<void> {
  const depthValue = resolveOptionValue(argv, '--depth');
  const depth = depthValue ? Number.parseInt(depthValue, 10) : undefined;
  const result = await graphService.analyzeImpact({
    cwd: process.cwd(),
    documentIdOrPath: documentId,
    impact: depth && Number.isFinite(depth) ? { maxDepth: depth } : undefined
  });

  process.stdout.write(`Impact radius from ${result.node.id}\n`);
  if (result.findings.length === 0) {
    process.stdout.write('No connected documents were found.\n');
    return;
  }

  for (const finding of result.findings) {
    process.stdout.write(
      `  hop=${finding.hop} [${finding.priority}] ${finding.id} (${finding.direction} via ${finding.via})\n`
    );
  }
}

async function runGraphSummaryCommand(graphService: ReturnType<typeof createGraphService>): Promise<void> {
  const summary = await graphService.summarize({ cwd: process.cwd() });
  const graph = summary.graph;
  process.stdout.write(`Nodes: ${graph.stats.nodeCount}\n`);
  process.stdout.write(`Edges: ${graph.stats.edgeCount}\n`);

  process.stdout.write('By type:\n');
  for (const [type, count] of Object.entries(graph.stats.byType)) {
    process.stdout.write(`  - ${type}: ${count}\n`);
  }

  if (summary.topFeatures.length > 0) {
    process.stdout.write('Top features:\n');
    for (const feature of summary.topFeatures) {
      process.stdout.write(`  - ${feature.feature}: ${feature.count}\n`);
    }
  }

  if (graph.integrity.orphanNodeIds.length > 0) {
    process.stdout.write(`Orphan nodes (${graph.integrity.orphanNodeIds.length}):\n`);
    for (const orphan of graph.integrity.orphanNodeIds.slice(0, 10)) {
      process.stdout.write(`  - ${orphan}\n`);
    }
  } else {
    process.stdout.write('No orphan nodes detected.\n');
  }

  if (graph.integrity.danglingEdges.length > 0) {
    process.stdout.write(`Dangling references (${graph.integrity.danglingEdges.length}):\n`);
    for (const edge of graph.integrity.danglingEdges.slice(0, 5)) {
      process.stdout.write(`  - ${edge.from} -> ${edge.to} (${edge.relation})\n`);
    }
  }

  renderGraphWarnings(graph.errors);
}

function normalizeGraphFormat(value?: string | boolean): GraphOutputFormat {
  if (!value || typeof value !== 'string') {
    return 'json';
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'json' || normalized === 'mermaid') {
    return normalized;
  }
  throw new Error(`Invalid --format value: ${value}`);
}

function resolveOptionValue(argv: string[], optionName: string): string | undefined {
  if (!Array.isArray(argv)) {
    return undefined;
  }
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    if (token.startsWith(`${optionName}=`)) {
      const [, value] = token.split('=');
      return value;
    }
    if (token === optionName && index + 1 < argv.length) {
      const next = argv[index + 1];
      if (next && !next.startsWith('--')) {
        return next;
      }
    }
  }
  return undefined;
}

function renderGraphWarnings(errors: { path: string; message: string }[]): void {
  if (!errors || errors.length === 0) {
    return;
  }
  process.stderr.write('Warnings while building graph:\n');
  for (const entry of errors.slice(0, 10)) {
    process.stderr.write(`  - ${entry.path}: ${entry.message}\n`);
  }
  if (errors.length > 10) {
    process.stderr.write(`  ... ${errors.length - 10} more warnings\n`);
  }
}

function printEdgeList(label: string, edges: { from: string; to: string }[], selector: (edge: any) => string) {
  if (!edges || edges.length === 0) {
    process.stdout.write(`${label}: (none)\n`);
    return;
  }
  process.stdout.write(`${label}:\n`);
  for (const edge of edges) {
    process.stdout.write(`  - ${selector(edge)}\n`);
  }
}

function handleCommandError(error: unknown): void {
  if (error instanceof FileAlreadyExistsError) {
    process.stderr.write(`Error: File already exists at ${error.filePath}\n`);
  } else if (error instanceof TemplateNotFoundError) {
    process.stderr.write(`Error: Template not found (${error.templateName})\n`);
  } else if (error instanceof ConfigError) {
    process.stderr.write(`Error: ${error.message}\n`);
  } else if (error instanceof Error) {
    process.stderr.write(`Error: ${error.message}\n`);
  } else {
    process.stderr.write('Error: Unknown error\n');
  }
  process.exitCode = 1;
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const fileSystemAdapter = new FileSystemAdapter();
  const templateService = new TemplateService({
    templateRoot: resolveTemplateRoot(),
    overrideRoot: resolveTemplateOverrideRoot()
  });
  const guardService = createGuardService();

  const program = new Command();
  program.name('eutelo').description('Eutelo documentation toolkit');

  program
    .command('init')
    .description('Initialize the eutelo-docs structure in the current directory')
    .option('--dry-run', 'Show directories without writing to disk')
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async (options: InitCliOptions = {}) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const scaffoldService = createScaffoldService({
            fileSystemAdapter,
            templateService,
            docsRoot,
            scaffold: config.scaffold
          });
          await runInitCommand(scaffoldService, options);
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  const add = program.command('add').description('Generate documentation from templates');
  const graph = program.command('graph').description('Inspect the document dependency graph');
  const configCommand = program.command('config').description('Inspect or debug Eutelo configuration');

  program
    .command('lint [paths...]')
    .description('Run doc-lint across documentation files')
    .option('--format <format>', 'Output format (text or json)')
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async (paths: string[], options: LintCliOptions = {}) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const ruleEngine = new RuleEngine({ docsRoot });
          await runLintCommand(ruleEngine, fileSystemAdapter, { ...options, paths }, argv, docsRoot);
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  add
    .command('prd <feature>')
    .description('Generate a PRD document for the given feature')
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async (feature: string) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const addDocumentService = createAddDocumentService({
            fileSystemAdapter,
            templateService,
            docsRoot,
            scaffold: config.scaffold
          });
          await executeAddDocument(addDocumentService, 'prd', { feature });
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  add
    .command('beh <feature>')
    .description('Generate a BEH document for the given feature')
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async (feature: string) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const addDocumentService = createAddDocumentService({
            fileSystemAdapter,
            templateService,
            docsRoot,
            scaffold: config.scaffold
          });
          await executeAddDocument(addDocumentService, 'beh', { feature });
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  add
    .command('sub-prd <feature> <sub>')
    .description('Generate a SUB-PRD document for the given feature and sub-feature')
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async (feature: string, sub: string) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const addDocumentService = createAddDocumentService({
            fileSystemAdapter,
            templateService,
            docsRoot,
            scaffold: config.scaffold
          });
          await executeAddDocument(addDocumentService, 'sub-prd', { feature, sub });
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  add
    .command('sub-beh <feature> <sub>')
    .description('Generate a sub BEH document linked to a SUB-PRD')
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async (feature: string, sub: string) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const addDocumentService = createAddDocumentService({
            fileSystemAdapter,
            templateService,
            docsRoot,
            scaffold: config.scaffold
          });
          await executeAddDocument(addDocumentService, 'sub-beh', { feature, sub });
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  add
    .command('dsg <feature>')
    .description('Generate a DSG document for the given feature')
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async (feature: string) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const addDocumentService = createAddDocumentService({
            fileSystemAdapter,
            templateService,
            docsRoot,
            scaffold: config.scaffold
          });
          await executeAddDocument(addDocumentService, 'dsg', { feature });
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  add
    .command('adr <feature>')
    .description('Generate an ADR document for the given feature with sequential numbering')
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async (feature: string) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const addDocumentService = createAddDocumentService({
            fileSystemAdapter,
            templateService,
            docsRoot,
            scaffold: config.scaffold
          });
          await executeAddDocument(addDocumentService, 'adr', { feature });
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  add
    .command('task <name>')
    .description('Generate a TASK plan document')
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async (name: string) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const addDocumentService = createAddDocumentService({
            fileSystemAdapter,
            templateService,
            docsRoot,
            scaffold: config.scaffold
          });
          await executeAddDocument(addDocumentService, 'task', { name });
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  add
    .command('ops <name>')
    .description('Generate an OPS runbook document')
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async (name: string) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const addDocumentService = createAddDocumentService({
            fileSystemAdapter,
            templateService,
            docsRoot,
            scaffold: config.scaffold
          });
          await executeAddDocument(addDocumentService, 'ops', { name });
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  program
    .command('sync')
    .description('Generate any missing documentation artifacts based on the current structure')
    .option('--check-only', 'Report missing documents without writing to disk')
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async (options: SyncCliOptions = {}) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const scaffoldService = createScaffoldService({
            fileSystemAdapter,
            templateService,
            docsRoot,
            scaffold: config.scaffold
          });
          await runSyncCommand(scaffoldService, options);
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  program
    .command('check')
    .description('Validate eutelo-docs structure and frontmatter consistency')
    .option('--format <format>', 'Output format: text or json')
    .option('--ci', 'Emit CI-friendly JSON output')
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async (options: CheckCliOptions = {}) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const validationService = createValidationService({
            fileSystemAdapter,
            docsRoot,
            frontmatterSchemas: config.frontmatter.schemas,
            rootParentIds: config.frontmatter.rootParentIds,
            scaffold: config.scaffold
          });
          await runCheckCommand(validationService, options, argv);
        });
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
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async (options: GuardCliOptions = {}, documents: string[] = []) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const configuredGuardService = createGuardService({
            fileSystemAdapter,
            prompts: config.guard.prompts
          });
          await runGuardCommand(configuredGuardService, documents, options, argv);
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  graph
    .command('build')
    .description('Scan eutelo-docs and output the document graph')
    .option('--format <format>', 'Output format (json or mermaid)')
    .option('--output <file>', 'Write the graph to a file')
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async () => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const graphService = createGraphService({
            fileSystemAdapter,
            docsRoot,
            frontmatterSchemas: config.frontmatter.schemas,
            scaffold: config.scaffold
          });
          await runGraphBuildCommand(graphService, argv);
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  graph
    .command('show <documentId>')
    .description('Display parents, children, and related nodes for a document')
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async (documentId: string) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const graphService = createGraphService({
            fileSystemAdapter,
            docsRoot,
            frontmatterSchemas: config.frontmatter.schemas,
            scaffold: config.scaffold
          });
          await runGraphShowCommand(graphService, documentId);
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  graph
    .command('impact <documentId>')
    .description('List 1-hop / 2-hop dependencies for a document')
    .option('--depth <n>', 'Search depth (default: 3)')
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async (documentId: string) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const graphService = createGraphService({
            fileSystemAdapter,
            docsRoot,
            frontmatterSchemas: config.frontmatter.schemas,
            scaffold: config.scaffold
          });
          await runGraphImpactCommand(graphService, documentId, argv);
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  graph
    .command('summary')
    .description('Show graph-wide statistics and orphan nodes')
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async () => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const graphService = createGraphService({
            fileSystemAdapter,
            docsRoot,
            frontmatterSchemas: config.frontmatter.schemas,
            scaffold: config.scaffold
          });
          await runGraphSummaryCommand(graphService);
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  configCommand
    .command('inspect')
    .description('Resolve eutelo.config.* and presets, showing merged values')
    .option('--config <path>', 'Explicit config file path')
    .option('--format <format>', 'Output format (text or json)')
    .action(async (options: ConfigInspectOptions) => {
      try {
        await runConfigInspect(options, argv);
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
  const debugMode = process.env.EUTELO_GUARD_DEBUG === 'true' || process.env.EUTELO_GUARD_DEBUG === '1';
  
  if (format === 'json') {
    const payload: Record<string, unknown> = {
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
    
    // Include LLM response in JSON output if debug mode is enabled
    if (debugMode && result.llmResponse) {
      payload.llmResponse = result.llmResponse;
    }
    
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }
  
  // For text format, log LLM response to stderr if debug mode is enabled
  if (debugMode && result.llmResponse) {
    process.stderr.write('\n=== LLM Response (Debug) ===\n');
    process.stderr.write(result.llmResponse);
    process.stderr.write('\n=== End LLM Response ===\n\n');
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
