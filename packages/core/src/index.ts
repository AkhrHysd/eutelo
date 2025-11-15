export { REQUIRED_DIRECTORIES } from './constants/requiredDirectories.js';
export {
  ScaffoldService,
  createScaffoldService
} from './services/ScaffoldService.js';
export type {
  InitResult,
  InitOptions,
  ComputeInitPlanOptions,
  ScaffoldServiceDependencies
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
