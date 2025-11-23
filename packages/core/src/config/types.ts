export type DocumentKind = string;

export type FrontmatterFieldType = 'string' | 'number' | 'boolean' | 'array' | 'enum' | 'date';

export interface ScaffoldTemplateConfig {
  id: string;
  kind: DocumentKind;
  path: string;
  template: string;
  variables?: Record<string, string>;
}

export interface FrontmatterFieldSchema {
  type: FrontmatterFieldType;
  required?: boolean;
  enum?: string[];
}

export interface FrontmatterSchemaConfig {
  kind: DocumentKind;
  fields: Record<string, FrontmatterFieldSchema>;
}

export interface GuardPromptConfig {
  id: string;
  model?: string;
  temperature?: number;
  templatePath: string;
}

export interface EuteloConfig {
  presets?: string[];
  docsRoot?: string;
  scaffold?: Record<string, ScaffoldTemplateConfig>;
  frontmatter?: {
    schemas?: FrontmatterSchemaConfig[];
    rootParentIds?: string[];
  };
  guard?: {
    prompts?: Record<string, GuardPromptConfig>;
  };
}

export interface ConfigResolutionLayerMeta {
  type: 'project' | 'preset';
  path?: string;
  name?: string;
}

export interface ConfigResolutionMeta {
  cwd: string;
  configPath?: string;
  layers: ConfigResolutionLayerMeta[];
}

export interface EuteloConfigResolved {
  presets: string[];
  docsRoot: string;
  scaffold: Record<string, ScaffoldTemplateConfig>;
  frontmatter: {
    schemas: FrontmatterSchemaConfig[];
    rootParentIds: string[];
  };
  guard: {
    prompts: Record<string, GuardPromptConfig>;
  };
  sources: ConfigResolutionMeta;
}
