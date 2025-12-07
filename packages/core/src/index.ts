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
  FileAlreadyExistsError,
  DocumentTypeNotFoundError
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
export type { GuardServiceDependencies, GuardRunResult, RunGuardOptions, RelatedDocumentOptions, RelatedDocumentInfo } from './services/GuardService.js';
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
  ImpactFinding,
  ResolveRelatedOptions,
  ResolvedRelatedDocument,
  ResolveRelatedResult
} from './graph/types.js';
export { RelatedDocumentResolver } from './graph/RelatedDocumentResolver.js';
export type { PriorityFilterConfig, RelatedDocumentResolverOptions } from './graph/RelatedDocumentResolver.js';
export { DocumentScanner } from './graph/DocumentScanner.js';
export type { DocumentScannerDependencies } from './graph/DocumentScanner.js';
export { GraphBuilder } from './graph/GraphBuilder.js';
export type { BuildGraphOptions, GraphBuildArtifacts } from './graph/GraphBuilder.js';
export { GraphCache } from './graph/GraphCache.js';
export type { CachedGraphData, GraphCacheOptions } from './graph/GraphCache.js';
export {
  loadConfig,
  defineConfig,
  DocumentTypeRegistry
} from './config/index.js';
export type {
  EuteloConfig,
  EuteloConfigResolved,
  ConfigResolutionMeta,
  ConfigResolutionLayerMeta,
  FrontmatterSchemaConfig,
  FrontmatterFieldSchema,
  GuardPromptConfig,
  ScaffoldTemplateConfig,
  DirectoryFileDefinition,
  DirectoryStructure,
  DirectoryStructureMap,
  NormalizedDirectoryStructure,
  DynamicPathOptions
} from './config/types.js';
export {
  ConfigError,
  ConfigFileNotFoundError,
  ConfigParseError,
  ConfigValidationError
} from './config/errors.js';
export {
  RuleValidationService,
  createRuleValidationService
} from './rule-validation/RuleValidationService.js';
export {
  PromptComposer
} from './rule-validation/PromptComposer.js';
export {
  LLMValidator
} from './rule-validation/LLMValidator.js';
export type {
  RuleValidationServiceDependencies,
  RunValidationOptions,
  ValidationRunResult,
  RuleValidationIssue,
  RuleValidationResult,
  ValidationRunError,
  ValidationOutputFormat
} from './rule-validation/types.js';
