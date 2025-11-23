export { REQUIRED_DIRECTORIES } from './constants/requiredDirectories.js';
export { CHECK_EXIT_CODES } from './constants/check.js';
export { GUARD_EXIT_CODES } from './constants/guard.js';
export {
  ScaffoldService,
  createScaffoldService
} from './services/ScaffoldService.js';
export type {
  InitResult,
  InitOptions,
  ComputeInitPlanOptions,
  ScaffoldServiceDependencies,
  SyncOptions,
  SyncResult,
  SyncPlanEntry
} from './services/ScaffoldService.js';
export {
  AddDocumentService,
  createAddDocumentService,
  FileAlreadyExistsError
} from './services/AddDocumentService.js';
export type {
  AddDocumentOptions,
  AddDocumentResult,
  AddDocumentServiceDependencies,
  DocumentType,
  ResolveOutputPathOptions
} from './services/AddDocumentService.js';
export { TemplateService, TemplateNotFoundError } from './services/TemplateService.js';
export type { TemplateServiceOptions, TemplateVariables } from './services/TemplateService.js';
export {
  ValidationService,
  createValidationService
} from './services/ValidationService.js';
export type {
  RunChecksOptions,
  ValidationIssue,
  ValidationReport,
  MissingFieldIssue,
  InvalidNameIssue,
  ParentNotFoundIssue,
  ValidationServiceDependencies
} from './services/ValidationService.js';
export {
  GuardService,
  createGuardService
} from './services/GuardService.js';
export type { GuardServiceDependencies, GuardRunResult, RunGuardOptions } from './services/GuardService.js';
export type { GuardFinding, GuardRunError, GuardRunErrorType, GuardOutputFormat } from './services/GuardService.js';
export {
  FrontmatterParser
} from './doc-lint/frontmatter-parser.js';
export type {
  Frontmatter,
  FrontmatterIssue,
  FrontmatterParseResult,
  FrontmatterParserOptions,
  LintSeverity
} from './doc-lint/frontmatter-parser.js';
export { analyzeStructure, resolveParentPath } from './doc-lint/structure-analyzer.js';
export type { AnalyzeStructureOptions, StructureExpectation } from './doc-lint/structure-analyzer.js';
export { RuleEngine } from './doc-lint/rule-engine.js';
export type { DocLintIssue, LintResult, LintTarget, RuleEngineOptions } from './doc-lint/rule-engine.js';
export { resolveDocsRoot } from './constants/docsRoot.js';
export {
  GraphService,
  createGraphService
} from './services/GraphService.js';
export type {
  BuildGraphOptions as GraphBuildOptions,
  GraphSummary,
  ImpactAnalysisResult,
  NodeNeighborhood,
  GraphServiceDependencies
} from './services/GraphService.js';
export { GraphSerializer } from './graph/GraphSerializer.js';
export type {
  DocumentGraph,
  GraphEdge,
  GraphNode,
  GraphRelationType,
  ImpactFinding
} from './graph/types.js';
export {
  loadConfig,
  defineConfig
} from './config/index.js';
export type {
  EuteloConfig,
  EuteloConfigResolved,
  ConfigResolutionMeta,
  ConfigResolutionLayerMeta,
  FrontmatterSchemaConfig,
  FrontmatterFieldSchema,
  GuardPromptConfig,
  ScaffoldTemplateConfig
} from './config/types.js';
export {
  ConfigError,
  ConfigFileNotFoundError,
  ConfigParseError,
  ConfigValidationError
} from './config/errors.js';
