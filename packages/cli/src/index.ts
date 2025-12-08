import { Command } from '@eutelo/commander';
import { createRequire } from 'node:module';
import path from 'node:path';
import { config } from 'dotenv';
import {
  FileAlreadyExistsError,
  TemplateNotFoundError,
  TemplateService,
  createAddDocumentService,
  createScaffoldService,
  createGuardService,
  createRuleValidationService,
  type DocumentType,
  GUARD_EXIT_CODES,
  type GuardRunResult,
  type GuardOutputFormat,
  type ValidationRunResult,
  type ValidationOutputFormat,
  loadConfig,
  ConfigError,
  DocumentTypeNotFoundError,
  DocumentTypeRegistry
} from '@eutelo/core';
import type { EuteloConfigResolved, ScaffoldTemplateConfig } from '@eutelo/core';
import { FileSystemAdapter } from '@eutelo/infrastructure';

// Load .env file from project root (where CLI is executed)
// This allows users to place .env in their project root directory
// dotenv.config() will silently continue if the file doesn't exist
const projectRoot = process.cwd();
const envPath = path.join(projectRoot, '.env');
config({ path: envPath });

type InitCliOptions = {
  dryRun?: boolean;
  createPlaceholders?: boolean;
  skipDynamicPaths?: boolean;
};

type AddParams = {
  feature?: string;
  sub?: string;
  name?: string;
};

type GuardCliOptions = {
  format?: string;
  failOnError?: boolean;
  warnOnly?: boolean;
  check?: string;
  related?: boolean;
  depth?: string;
  all?: boolean;
};

type ValidateCliOptions = {
  format?: string;
  failOnError?: boolean;
  warnOnly?: boolean;
  ci?: boolean;
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

async function runGuardCommand(
  guardService: ReturnType<typeof createGuardService>,
  documents: string[],
  options: GuardCliOptions = {},
  argv: string[] = []
) {
  const normalizedDocuments = normalizeGuardDocuments(documents, argv);
  const formatOverride = resolveFormatArgument(argv);
  const format = normalizeGuardFormat(formatOverride ?? options.format);
  const checkOverride = resolveOptionValue(argv, '--check') ?? options.check;
  const warnOnly = Boolean(options.warnOnly);
  const failOnError = warnOnly ? false : options.failOnError ?? true;
  
  // Parse related document options
  const noRelated = argv.includes('--no-related');
  const allRelated = options.all || argv.includes('--all');
  const depthStr = resolveOptionValue(argv, '--depth') ?? options.depth;
  const depth = depthStr ? parseInt(depthStr, 10) : 1;
  
  const relatedOptions = {
    enabled: !noRelated,
    depth: allRelated ? undefined : depth,
    all: allRelated
  };
  
  // Log related document collection info if not in JSON format
  if (format !== 'json' && relatedOptions.enabled) {
    const depthInfo = allRelated ? 'unlimited' : `${depth}`;
    process.stderr.write(`Resolving related documents (depth: ${depthInfo})...\n`);
  }
  
  const result = await guardService.run({
    documents: normalizedDocuments,
    checkId: typeof checkOverride === 'string' ? checkOverride : undefined,
    format,
    warnOnly,
    failOnError,
    relatedOptions
  });

  // Log collected related documents if any
  if (format !== 'json' && result.relatedDocuments && result.relatedDocuments.length > 0) {
    process.stderr.write(`  Found ${result.relatedDocuments.length} related document(s):\n`);
    for (const doc of result.relatedDocuments) {
      const dir = doc.direction === 'upstream' ? '↑' : '↓';
      process.stderr.write(`    ${dir} ${doc.id} (${doc.via}, hop=${doc.hop})\n`);
    }
    process.stderr.write('\n');
  } else if (format !== 'json' && relatedOptions.enabled) {
    process.stderr.write(`  No related documents found.\n\n`);
  }

  renderGuardResult(result, format);
  process.exitCode = determineGuardExitCode(result, { warnOnly, failOnError });
}

async function runValidateCommand(
  validationService: ReturnType<typeof createRuleValidationService>,
  documents: string[],
  options: ValidateCliOptions = {},
  argv: string[] = []
): Promise<void> {
  // Handle CI mode
  const ciMode = Boolean(options.ci);
  const formatOverride = resolveFormatArgument(argv);
  const format = normalizeValidateFormat(formatOverride ?? (ciMode ? 'json' : options.format));
  const warnOnly = Boolean(options.warnOnly);
  const failOnError = ciMode ? true : (warnOnly ? false : options.failOnError ?? true);

  // Normalize document paths
  const normalizedDocuments = normalizeValidateDocuments(documents, argv);

  const result = await validationService.runValidation({
    documents: normalizedDocuments,
    format,
    failOnError,
    warnOnly
  });

  renderValidateResult(result, format);
  process.exitCode = determineValidateExitCode(result, { warnOnly, failOnError });
}

function normalizeValidateDocuments(positional: string[], argv: string[]): string[] {
  if (Array.isArray(positional) && positional.length > 0) {
    return positional
      .filter((doc) => typeof doc === 'string')
      .map((doc) => doc.trim())
      .filter((doc) => doc.length > 0);
  }

  const validateIndex = Array.isArray(argv) ? argv.indexOf('rule') : -1;
  if (validateIndex === -1) {
    return [];
  }
  const collected: string[] = [];
  let skipNext = false;
  let readEverything = false;
  for (const token of argv.slice(validateIndex + 1)) {
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


function handleCommandError(error: unknown): void {
  if (error instanceof FileAlreadyExistsError) {
    process.stderr.write(`Error: File already exists at ${error.filePath}\n`);
  } else if (error instanceof TemplateNotFoundError) {
    process.stderr.write(`Error: Template not found (${error.templateName})\n`);
  } else if (error instanceof DocumentTypeNotFoundError) {
    process.stderr.write(`Error: ${error.message}\n`);
    if (error.availableTypes.length > 0) {
      process.stderr.write(`Available document types: ${error.availableTypes.join(', ')}\n`);
    }
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

  const program = new Command();
  program.name('eutelo').description('Eutelo documentation toolkit');

  program
    .command('init')
    .description('Initialize the eutelo-docs structure in the current directory')
    .option('--dry-run', 'Show directories without writing to disk')
    .option('--config <path>', 'Path to eutelo.config.*')
    .option('--create-placeholders', 'Create placeholder directories for dynamic paths (default: true)')
    .option('--skip-dynamic-paths', 'Skip creating directories for dynamic paths')
    .action(async (options: InitCliOptions = {}) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          
          // DynamicPathOptions を構築
          const dynamicPathOptions: import('@eutelo/core').DynamicPathOptions = {};
          if (options.skipDynamicPaths) {
            dynamicPathOptions.createPlaceholders = false;
          } else if (options.createPlaceholders !== undefined) {
            dynamicPathOptions.createPlaceholders = options.createPlaceholders;
          } else {
          // デフォルトでプレースホルダーを作成
          dynamicPathOptions.createPlaceholders = true;
        }
        
        const scaffoldService = createScaffoldService({
            fileSystemAdapter,
            templateService,
            docsRoot,
            scaffold: config.scaffold,
            directoryStructure: config.directoryStructure,
            dynamicPathOptions
          });
          await runInitCommand(scaffoldService, options);
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  const add = program.command('add').description('Generate documentation from templates');

  // Track registered command names to avoid duplicates
  const registeredCommands = new Set<string>();

  // Helper function to check if scaffold requires specific placeholders
  function usesPlaceholder(scaffold: ScaffoldTemplateConfig, placeholder: string): boolean {
    const token = `{${placeholder}}`;
    if (scaffold.path.includes(token)) {
      return true;
    }
    if (scaffold.variables) {
      for (const value of Object.values(scaffold.variables)) {
        if (typeof value === 'string' && value.includes(token)) {
          return true;
        }
      }
    }
    return false;
  }

  // Helper function to determine command arguments based on scaffold config
  function determineCommandArgs(scaffold: ScaffoldTemplateConfig): string {
    const requiresFeature = usesPlaceholder(scaffold, 'FEATURE');
    const requiresSub = usesPlaceholder(scaffold, 'SUB');
    const requiresName = usesPlaceholder(scaffold, 'NAME');

    if (requiresFeature && requiresSub) {
      return '<feature> <sub>';
    } else if (requiresFeature) {
      return '<feature>';
    } else if (requiresName) {
      return '<name>';
    }
    return '';
  }

  // Helper function to build params from command arguments
  function buildAddParams(
    scaffold: ScaffoldTemplateConfig,
    args: Record<string, string>
  ): AddParams {
    const params: AddParams = {};
    if (usesPlaceholder(scaffold, 'FEATURE')) {
      params.feature = args.feature;
    }
    if (usesPlaceholder(scaffold, 'SUB')) {
      params.sub = args.sub;
    }
    if (usesPlaceholder(scaffold, 'NAME')) {
      params.name = args.name;
    }
    return params;
  }

  // Dynamically generate commands from config
  // This will be called before program.parseAsync
  async function registerDynamicCommands(): Promise<void> {
    try {
      const config = await getResolvedConfigCached();
      const registry = new DocumentTypeRegistry(config);
      const documentTypes = registry.getDocumentTypes();

      for (const type of documentTypes) {
        // Skip if already registered as fixed command
        if (registeredCommands.has(type)) {
          continue;
        }

        const scaffold = registry.getScaffoldConfig(type);
        if (!scaffold) {
          continue;
        }

        const commandArgs = determineCommandArgs(scaffold);
        const commandName = `${type}${commandArgs ? ` ${commandArgs}` : ''}`;

        // Register dynamic command
        add
          .command(commandName)
          .description(`Generate a ${type.toUpperCase()} document`)
          .option('--config <path>', 'Path to eutelo.config.*')
          .action(async (...actionArgs: unknown[]) => {
            const configPath = resolveOptionValue(argv, '--config');
            try {
              await withConfig(configPath, async (resolvedConfig) => {
                const docsRoot = resolveDocsRootFromConfig(resolvedConfig);
                const addDocumentService = createAddDocumentService({
                  fileSystemAdapter,
                  templateService,
                  docsRoot,
                  scaffold: resolvedConfig.scaffold
                });

                // Parse arguments based on scaffold requirements
                const args: Record<string, string> = {};
                let argIndex = 0;
                if (usesPlaceholder(scaffold, 'FEATURE')) {
                  args.feature = actionArgs[argIndex] as string;
                  argIndex++;
                }
                if (usesPlaceholder(scaffold, 'SUB')) {
                  args.sub = actionArgs[argIndex] as string;
                  argIndex++;
                }
                if (usesPlaceholder(scaffold, 'NAME')) {
                  args.name = actionArgs[0] as string;
                }

                const params = buildAddParams(scaffold, args);
                await executeAddDocument(addDocumentService, type, params);
              });
            } catch (error) {
              handleCommandError(error);
            }
          });

        registeredCommands.add(type);
      }
    } catch (error) {
      // If config loading fails, just continue without dynamic commands
      // This maintains backward compatibility
      if (error instanceof ConfigError) {
        // Silently ignore config errors during command registration
        // Commands will fail later with proper error messages
      }
    }
  }

  program
    .command('align [documents...]')
    .description('Check document consistency across related documents')
    .option('--format <format>', 'Output format (text or json)')
    .option('--fail-on-error', 'Exit with code 2 when issues are detected (default)')
    .option('--warn-only', 'Never exit with code 2, even when issues are detected')
    .option('--check <id>', 'Guard prompt id to execute (config.guard.prompts key)')
    .option('--config <path>', 'Path to eutelo.config.*')
    .option('--with-related', 'Automatically collect related documents (default: enabled)')
    .option('--no-related', 'Disable automatic related document collection')
    .option('--depth <number>', 'Depth for related document traversal (default: 1)')
    .option('--all', 'Collect all related documents regardless of depth')
    .action(async (options: GuardCliOptions = {}, documents: string[] = []) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const configuredGuardService = createGuardService({
            fileSystemAdapter,
            prompts: config.guard.prompts,
            frontmatterSchemas: config.frontmatter.schemas,
            scaffold: config.scaffold,
            docsRoot,
            cwd: process.cwd()
          });
          await runGuardCommand(configuredGuardService, documents, options, argv);
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  program
    .command('rule [documents...]')
    .description('Validate documents against user-defined rules')
    .option('--format <format>', 'Output format (text or json)')
    .option('--fail-on-error', 'Exit with code 1 when rule violations are detected (default)')
    .option('--warn-only', 'Never exit with code 1, even when rule violations are detected')
    .option('--ci', 'CI mode (enables --format=json and --fail-on-error)')
    .option('--config <path>', 'Path to eutelo.config.*')
    .action(async (options: ValidateCliOptions = {}, documents: string[] = []) => {
      const configPath = resolveOptionValue(argv, '--config');
      try {
        await withConfig(configPath, async (config) => {
          const docsRoot = resolveDocsRootFromConfig(config);
          const configuredValidationService = createRuleValidationService({
            fileSystemAdapter,
            docsRoot,
            cwd: process.cwd(),
            config
          });
          await runValidateCommand(configuredValidationService, documents, options, argv);
        });
      } catch (error) {
        handleCommandError(error);
      }
    });

  // Register dynamic commands from config before parsing
  await registerDynamicCommands();

  // Check for unknown document types before parsing
  // This handles cases where a user tries to use an unknown document type
  const addIndex = argv.indexOf('add');
  if (addIndex !== -1 && addIndex + 1 < argv.length) {
    const documentType = argv[addIndex + 1];
    // Skip if it's an option (starts with --)
    if (documentType && !documentType.startsWith('--')) {
      // Check if this is a registered command
      const isRegistered = registeredCommands.has(documentType);
      if (!isRegistered) {
        // Check if it's a known document type from config
        try {
          const config = await getResolvedConfigCached();
          const registry = new DocumentTypeRegistry(config);
          const documentTypes = registry.getDocumentTypes();
          if (!documentTypes.includes(documentType)) {
            // Unknown document type - throw error
            const availableTypes = registry.getDocumentTypes();
            handleCommandError(new DocumentTypeNotFoundError(documentType, availableTypes));
            return;
          }
        } catch (error) {
          // If config loading fails, let commander handle the error
          if (error instanceof ConfigError) {
            // Silently continue - commander will handle unknown commands
          }
        }
      }
    }
  }

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

function normalizeValidateFormat(value?: string | boolean): ValidationOutputFormat {
  if (!value || typeof value !== 'string') {
    return 'text';
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'text' || normalized === 'json') {
    return normalized;
  }
  throw new Error(`Invalid --format value: ${value}`);
}

function renderValidateResult(result: ValidationRunResult, format: ValidationOutputFormat): void {
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  // Text format
  const { summary, results, error } = result;

  if (error) {
    process.stdout.write(`Error: ${error.message}\n`);
    if (error.file) {
      process.stdout.write(`  File: ${error.file}\n`);
    }
    if (error.line) {
      process.stdout.write(`  Line: ${error.line}\n`);
    }
    return;
  }

  if (summary.errors === 0 && summary.warnings === 0) {
    process.stdout.write(`✓ Validated ${summary.total} document(s)\n`);
    for (const r of results) {
      process.stdout.write(`  ✓ ${r.file}\n`);
    }
    return;
  }

  process.stdout.write(`✗ Validated ${summary.total} document(s), found ${summary.errors} error(s), ${summary.warnings} warning(s)\n\n`);

  for (const r of results) {
    if (r.issues.length === 0) {
      continue;
    }
    process.stdout.write(`${r.file}\n`);
    for (const issue of r.issues) {
      const icon = issue.severity === 'error' ? '✗' : '⚠';
      process.stdout.write(`  ${icon} ${issue.severity === 'error' ? 'Error' : 'Warning'}: ${issue.message}\n`);
      if (issue.rule) {
        process.stdout.write(`    Rule: ${issue.rule}\n`);
      }
      if (issue.hint) {
        process.stdout.write(`    Hint: ${issue.hint}\n`);
      }
    }
    process.stdout.write('\n');
  }
}

type ValidateExitIntent = {
  warnOnly: boolean;
  failOnError: boolean;
};

function determineValidateExitCode(result: ValidationRunResult, intent: ValidateExitIntent): number {
  // Exit code 2: System error (file not found, syntax error, etc.)
  if (result.error) {
    return 2;
  }

  // Exit code 0: Success or warn-only mode with warnings only
  if (intent.warnOnly) {
    return 0;
  }

  // Exit code 1: Rule violations found
  if (result.summary.errors > 0 && intent.failOnError) {
    return 1;
  }

  // Exit code 0: No errors or fail-on-error disabled
  return 0;
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

  const guardIndex = Array.isArray(argv) ? argv.indexOf('align') : -1;
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
