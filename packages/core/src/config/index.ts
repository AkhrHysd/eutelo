export { defineConfig } from './defineConfig.js';
export { loadConfig } from './resolver.js';
export type { LoadConfigOptions } from './resolver.js';
export {
  ConfigError,
  ConfigFileNotFoundError,
  ConfigParseError,
  ConfigValidationError
} from './errors.js';
export { DocumentTypeRegistry } from './DocumentTypeRegistry.js';
export type {
  EuteloConfig,
  EuteloConfigResolved,
  FrontmatterSchemaConfig,
  FrontmatterFieldSchema,
  GuardPromptConfig,
  ScaffoldTemplateConfig,
  ConfigResolutionMeta,
  ConfigResolutionLayerMeta
} from './types.js';
