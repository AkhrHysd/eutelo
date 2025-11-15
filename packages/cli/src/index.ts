import { Command } from 'commander';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  FileAlreadyExistsError,
  TemplateNotFoundError,
  TemplateService,
  createAddDocumentService,
  createScaffoldService,
  type DocumentType,
  type SyncOptions
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

  await program.parseAsync(argv);
}
