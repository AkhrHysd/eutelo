import { parseArgs } from 'node:util';
import { createScaffoldService, type InitResult } from '@eutelo/core';
import { FileSystemAdapter } from '@eutelo/infrastructure';

type ParsedValues = Record<string, unknown> & { 'dry-run'?: boolean; dryRun?: boolean };

function printHelp(): void {
  const message = `Eutelo CLI\n\nUsage:\n  eutelo init [--dry-run]\n\nCommands:\n  init        Initialize the eutelo-docs structure in the current directory.\n\nOptions:\n  --dry-run   Show the directories that would be created without writing.\n`;
  process.stdout.write(message);
}

function formatList(items: string[]): string {
  return items.map((item) => `  - ${item}`).join('\n');
}

async function handleInit(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      'dry-run': { type: 'boolean', default: false },
      dryRun: { type: 'boolean' }
    },
    allowPositionals: true
  });

  const typedValues = values as ParsedValues;
  const dryRun = typedValues['dry-run'] ?? typedValues.dryRun ?? false;
  const fileSystemAdapter = new FileSystemAdapter();
  const scaffoldService = createScaffoldService({ fileSystemAdapter });

  const result = (await scaffoldService.init({ cwd: process.cwd(), dryRun })) as InitResult;

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

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const args = argv.slice(2);
  const command = args[0];
  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  const rest = args.slice(1);

  try {
    if (command === 'init') {
      await handleInit(rest);
      return;
    }

    process.stderr.write(`Unknown command: ${command}\n`);
    printHelp();
    process.exitCode = 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    process.stderr.write(`Error: ${message}\n`);
    process.exitCode = 1;
  }
}
