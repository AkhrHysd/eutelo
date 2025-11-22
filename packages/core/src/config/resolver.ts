import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { parse as parseYaml } from 'yaml';
import {
  ConfigError,
  ConfigFileNotFoundError,
  ConfigParseError,
  ConfigValidationError
} from './errors.js';
import type {
  ConfigResolutionLayerMeta,
  EuteloConfig,
  EuteloConfigResolved,
  FrontmatterFieldSchema,
  FrontmatterSchemaConfig,
  GuardPromptConfig,
  ScaffoldTemplateConfig
} from './types.js';
import type { DocumentKind } from './types.js';
import { resolveDocsRoot } from '../constants/docsRoot.js';

type TypeScriptModule = typeof import('typescript');

export type LoadConfigOptions = {
  cwd?: string;
  configFile?: string;
  presets?: string[];
};

const CONFIG_FILENAMES = [
  'eutelo.config.ts',
  'eutelo.config.mts',
  'eutelo.config.cts',
  'eutelo.config.js',
  'eutelo.config.mjs',
  'eutelo.config.cjs',
  'eutelo.config.json',
  'eutelo.config.yaml',
  'eutelo.config.yml'
] as const;

export async function loadConfig(options: LoadConfigOptions = {}): Promise<EuteloConfigResolved> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  let configPath: string | undefined;

  if (options.configFile) {
    configPath = path.resolve(cwd, options.configFile);
    if (!(await fileExists(configPath))) {
      throw new ConfigFileNotFoundError(configPath);
    }
  } else {
    configPath = await findConfigFile(cwd);
  }

  const layers: Partial<EuteloConfig>[] = [];
  const presetMeta: ConfigResolutionLayerMeta[] = [];
  const projectMeta: ConfigResolutionLayerMeta[] = [];
  const appliedPresets: string[] = [];
  const presetVisited = new Set<string>();

  let projectPresets: string[] = [];
  if (configPath) {
    const normalized = await loadAndNormalizeConfig(configPath, configPath);
    const extracted = extractPresets(normalized);
    projectPresets = extracted.presets;
    layers.push(extracted.config);
    projectMeta.push({ type: 'project', path: configPath });
  }

  const presetQueue = [...(options.presets ?? []), ...projectPresets];
  const presetLayers: Partial<EuteloConfig>[] = [];

  for (const preset of presetQueue) {
    await applyPresetRecursive({
      specifier: preset,
      cwd,
      visited: presetVisited,
      applied: appliedPresets,
      layers: presetLayers,
      meta: presetMeta
    });
  }

  // preset layers should be applied before project config
  const mergedLayers = [...presetLayers, ...layers];
  const merged = mergeConfigLayers(mergedLayers);

  return {
    presets: appliedPresets,
    docsRoot: merged.docsRoot ?? resolveDocsRoot(),
    scaffold: merged.scaffold,
    frontmatter: merged.frontmatter,
    guard: merged.guard,
    sources: {
      cwd,
      configPath,
      layers: [...presetMeta, ...projectMeta]
    }
  };
}

async function applyPresetRecursive({
  specifier,
  cwd,
  visited,
  applied,
  layers,
  meta
}: {
  specifier: string;
  cwd: string;
  visited: Set<string>;
  applied: string[];
  layers: Partial<EuteloConfig>[];
  meta: ConfigResolutionLayerMeta[];
}): Promise<void> {
  const normalized = typeof specifier === 'string' ? specifier.trim() : '';
  if (!normalized || visited.has(normalized)) {
    return;
  }
  visited.add(normalized);

  const preset = await loadPreset(normalized, cwd);
  const normalizedConfig = normalizeConfigFragment(preset.config, preset.path ?? normalized);
  const extracted = extractPresets(normalizedConfig);

  for (const nested of extracted.presets) {
    await applyPresetRecursive({ specifier: nested, cwd, visited, applied, layers, meta });
  }

  layers.push(extracted.config);
  meta.push({ type: 'preset', name: normalized, path: preset.path });
  applied.push(normalized);
}

async function loadPreset(
  specifier: string,
  cwd: string
): Promise<{ config: unknown; path?: string }> {
  const requireFromCwd = createRequire(path.join(cwd, '__preset.cjs'));
  let resolvedPath: string;
  try {
    resolvedPath = requireFromCwd.resolve(specifier);
  } catch (error) {
    throw new ConfigError(`Unable to resolve preset "${specifier}": ${(error as Error).message}`);
  }

  try {
    const required = requireFromCwd(specifier);
    return { config: unwrapModuleExport(required), path: resolvedPath };
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ERR_REQUIRE_ESM') {
      const imported = await import(pathToFileURL(resolvedPath).href);
      return { config: unwrapModuleExport(imported), path: resolvedPath };
    }
    throw new ConfigError(`Failed to load preset "${specifier}": ${(error as Error).message}`);
  }
}

async function loadAndNormalizeConfig(filePath: string, context: string): Promise<Partial<EuteloConfig>> {
  const raw = await loadConfigFile(filePath);
  return normalizeConfigFragment(raw, context);
}

async function loadConfigFile(filePath: string): Promise<unknown> {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === '.json') {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    }
    if (ext === '.yaml' || ext === '.yml') {
      const content = await fs.readFile(filePath, 'utf8');
      return parseYaml(content);
    }
    if (ext === '.cjs') {
      const requireCurrent = createRequire(import.meta.url);
      return unwrapModuleExport(requireCurrent(filePath));
    }
    if (ext === '.js' || ext === '.mjs') {
      const imported = await import(pathToFileURL(filePath).href);
      return unwrapModuleExport(imported);
    }
    if (ext === '.ts' || ext === '.mts' || ext === '.cts') {
      return await loadTypeScriptModule(filePath);
    }
    throw new ConfigParseError(filePath, 'Unsupported config file type');
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    throw new ConfigParseError(filePath, (error as Error).message);
  }
}

async function loadTypeScriptModule(filePath: string): Promise<unknown> {
  const source = await fs.readFile(filePath, 'utf8');
  const compiler = resolveTypeScriptCompiler(path.dirname(filePath));
  const transpiled = compiler.transpileModule(source, {
    compilerOptions: {
      module: compiler.ModuleKind.CommonJS,
      target: compiler.ScriptTarget.ES2020,
      esModuleInterop: true
    },
    fileName: filePath
  });
  const exports = executeCommonJs(transpiled.outputText, filePath);
  return unwrapModuleExport(exports);
}

function resolveTypeScriptCompiler(fromDir: string): TypeScriptModule {
  const localRequire = createRequire(path.join(fromDir, '__tshelper.cjs'));
  try {
    return localRequire('typescript');
  } catch {
    // fallthrough
  }
  const coreRequire = createRequire(import.meta.url);
  try {
    return coreRequire('typescript');
  } catch {
    throw new ConfigError(
      'TypeScript compiler not found. Please install "typescript" in your project to load .ts configs.'
    );
  }
}

function executeCommonJs(code: string, filename: string): unknown {
  const module = { exports: {} as unknown };
  const dirname = path.dirname(filename);
  const sandbox = {
    module,
    exports: module.exports,
    require: createRequire(filename),
    __dirname: dirname,
    __filename: filename,
    process,
    console,
    setTimeout,
    clearTimeout,
    global: globalThis
  };
  runInNewContext(code, sandbox, { filename });
  return module.exports;
}

function unwrapModuleExport(candidate: unknown): unknown {
  if (candidate && typeof candidate === 'object') {
    const withExport = candidate as Record<string, unknown>;
    if (withExport.euteloPreset !== undefined) {
      return withExport.euteloPreset;
    }
    if (withExport.default !== undefined) {
      return withExport.default;
    }
  }
  if (typeof candidate === 'function') {
    return candidate();
  }
  return candidate;
}

function extractPresets(layer: Partial<EuteloConfig>): { config: Partial<EuteloConfig>; presets: string[] } {
  const { presets, ...rest } = layer;
  return { config: rest, presets: presets ?? [] };
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function findConfigFile(cwd: string): Promise<string | undefined> {
  for (const filename of CONFIG_FILENAMES) {
    const candidate = path.join(cwd, filename);
    if (await fileExists(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

type NormalizedGuardPrompts = Record<string, GuardPromptConfig>;

function normalizeConfigFragment(raw: unknown, context: string): Partial<EuteloConfig> {
  if (!isPlainObject(raw)) {
    throw new ConfigValidationError('Config must be an object', context);
  }

  const normalized: Partial<EuteloConfig> = {};

  if (raw.presets !== undefined) {
    normalized.presets = normalizePresetList(raw.presets, context);
  }
  if (raw.docsRoot !== undefined) {
    normalized.docsRoot = normalizeDocsRoot(raw.docsRoot, context);
  }

  if (raw.scaffold !== undefined) {
    normalized.scaffold = normalizeScaffold(raw.scaffold, context);
  }

  if (raw.frontmatter !== undefined) {
    if (!isPlainObject(raw.frontmatter)) {
      throw new ConfigValidationError('frontmatter must be an object', context);
    }
    const schemas = normalizeFrontmatterSchemas(raw.frontmatter.schemas, context);
    normalized.frontmatter = { schemas };
  }

  if (raw.guard !== undefined) {
    if (!isPlainObject(raw.guard)) {
      throw new ConfigValidationError('guard must be an object', context);
    }
    const prompts = normalizeGuardPrompts(raw.guard.prompts, context);
    normalized.guard = { prompts };
  }

  return normalized;
}

function normalizePresetList(value: unknown, context: string): string[] {
  if (!Array.isArray(value)) {
    throw new ConfigValidationError('presets must be an array of package names', context);
  }
  return value.map((entry, index) => {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      throw new ConfigValidationError(`presets[${index}] must be a non-empty string`, context);
    }
    return entry.trim();
  });
}

function normalizeDocsRoot(value: unknown, context: string): string {
  return normalizeString(value, 'docsRoot', context);
}

function normalizeScaffold(value: unknown, context: string): Record<string, ScaffoldTemplateConfig> {
  if (!isPlainObject(value)) {
    throw new ConfigValidationError('scaffold must be an object', context);
  }
  const result: Record<string, ScaffoldTemplateConfig> = {};
  for (const [key, rawEntry] of Object.entries(value)) {
    if (!isPlainObject(rawEntry)) {
      throw new ConfigValidationError(`scaffold["${key}"] must be an object`, context);
    }
    const id = normalizeString(rawEntry.id ?? key, `scaffold["${key}"].id`, context);
    const kind = normalizeString(rawEntry.kind, `scaffold["${key}"].kind`, context);
    const docPath = normalizeString(rawEntry.path, `scaffold["${key}"].path`, context);
    const template = normalizeString(rawEntry.template, `scaffold["${key}"].template`, context);
    const variables = normalizeVariables(rawEntry.variables, `scaffold["${key}"].variables`, context);
    result[id] = { id, kind, path: docPath, template, ...(variables ? { variables } : {}) };
  }
  return result;
}

function normalizeVariables(
  value: unknown,
  fieldPath: string,
  context: string
): Record<string, string> | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isPlainObject(value)) {
    throw new ConfigValidationError(`${fieldPath} must be an object`, context);
  }
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'string') {
      throw new ConfigValidationError(`${fieldPath}["${key}"] must be a string`, context);
    }
    result[key] = entry;
  }
  return result;
}

function normalizeFrontmatterSchemas(value: unknown, context: string): FrontmatterSchemaConfig[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new ConfigValidationError('frontmatter.schemas must be an array', context);
  }
  return value.map((schema, index) => normalizeFrontmatterSchema(schema, index, context));
}

function normalizeFrontmatterSchema(
  value: unknown,
  index: number,
  context: string
): FrontmatterSchemaConfig {
  if (!isPlainObject(value)) {
    throw new ConfigValidationError(`frontmatter.schemas[${index}] must be an object`, context);
  }
  const kind = normalizeString(value.kind, `frontmatter.schemas[${index}].kind`, context);
  if (!isPlainObject(value.fields)) {
    throw new ConfigValidationError(`frontmatter.schemas[${index}].fields must be an object`, context);
  }
  const fields: Record<string, FrontmatterFieldSchema> = {};
  for (const [fieldName, rawField] of Object.entries(value.fields)) {
    fields[fieldName] = normalizeFrontmatterField(rawField, fieldName, index, context);
  }
  return { kind, fields };
}

function normalizeFrontmatterField(
  value: unknown,
  fieldName: string,
  schemaIndex: number,
  context: string
): FrontmatterFieldSchema {
  if (!isPlainObject(value)) {
    throw new ConfigValidationError(
      `frontmatter.schemas[${schemaIndex}].fields["${fieldName}"] must be an object`,
      context
    );
  }
  const typeValue = normalizeString(
    value.type,
    `frontmatter.schemas[${schemaIndex}].fields["${fieldName}"].type`,
    context
  );
  if (!['string', 'number', 'boolean', 'array', 'enum', 'date'].includes(typeValue)) {
    throw new ConfigValidationError(
      `Unsupported frontmatter field type "${typeValue}" for ${fieldName}`,
      context
    );
  }
  const schema: FrontmatterFieldSchema = { type: typeValue as FrontmatterFieldSchema['type'] };
  if (value.required !== undefined) {
    if (typeof value.required !== 'boolean') {
      throw new ConfigValidationError(
        `frontmatter.schemas[${schemaIndex}].fields["${fieldName}"].required must be boolean`,
        context
      );
    }
    schema.required = value.required;
  }
  if (schema.type === 'enum') {
    if (!Array.isArray(value.enum) || value.enum.some((entry) => typeof entry !== 'string')) {
      throw new ConfigValidationError(
        `frontmatter.schemas[${schemaIndex}].fields["${fieldName}"].enum must be a string array`,
        context
      );
    }
    schema.enum = value.enum.slice();
  }
  return schema;
}

function normalizeGuardPrompts(value: unknown, context: string): NormalizedGuardPrompts {
  if (value === undefined) {
    return {};
  }
  if (!isPlainObject(value)) {
    throw new ConfigValidationError('guard.prompts must be an object', context);
  }
  const result: NormalizedGuardPrompts = {};
  for (const [key, rawPrompt] of Object.entries(value)) {
    if (!isPlainObject(rawPrompt)) {
      throw new ConfigValidationError(`guard.prompts["${key}"] must be an object`, context);
    }
    const id = normalizeString(rawPrompt.id ?? key, `guard.prompts["${key}"].id`, context);
    const templatePath = normalizeString(
      rawPrompt.templatePath,
      `guard.prompts["${key}"].templatePath`,
      context
    );
    const prompt: GuardPromptConfig = { id, templatePath };
    if (rawPrompt.model !== undefined) {
      prompt.model = normalizeString(rawPrompt.model, `guard.prompts["${key}"].model`, context);
    }
    if (rawPrompt.temperature !== undefined) {
      if (typeof rawPrompt.temperature !== 'number' || Number.isNaN(rawPrompt.temperature)) {
        throw new ConfigValidationError(
          `guard.prompts["${key}"].temperature must be a number`,
          context
        );
      }
      prompt.temperature = rawPrompt.temperature;
    }
    result[id] = prompt;
  }
  return result;
}

function normalizeString(value: unknown, fieldPath: string, context: string): string {
  if (typeof value !== 'string') {
    throw new ConfigValidationError(`${fieldPath} must be a string`, context);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ConfigValidationError(`${fieldPath} cannot be empty`, context);
  }
  return trimmed;
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeConfigLayers(
  layers: Partial<EuteloConfig>[]
): Pick<EuteloConfigResolved, 'scaffold' | 'guard' | 'frontmatter'> & { docsRoot?: string } {
  const scaffold: Record<string, ScaffoldTemplateConfig> = {};
  const guardPrompts: Record<string, GuardPromptConfig> = {};
  const schemaMap = new Map<DocumentKind, FrontmatterSchemaConfig>();
  let docsRootOverride: string | undefined;

  for (const layer of layers) {
    if (!layer || typeof layer !== 'object') {
      continue;
    }
    if (layer.scaffold) {
      for (const entry of Object.values(layer.scaffold)) {
        scaffold[entry.id] = entry;
      }
    }
    if (layer.guard?.prompts) {
      for (const entry of Object.values(layer.guard.prompts)) {
        guardPrompts[entry.id] = entry;
      }
    }
    if (layer.frontmatter?.schemas) {
      for (const schema of layer.frontmatter.schemas) {
        schemaMap.set(schema.kind, schema);
      }
    }
    if (typeof layer.docsRoot === 'string' && layer.docsRoot.trim().length > 0) {
      docsRootOverride = layer.docsRoot;
    }
  }

  return {
    scaffold,
    guard: { prompts: guardPrompts },
    frontmatter: { schemas: Array.from(schemaMap.values()) },
    docsRoot: docsRootOverride
  };
}
