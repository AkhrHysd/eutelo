export type DocumentKind = string;

export type FrontmatterFieldType = 'string' | 'number' | 'boolean' | 'array' | 'enum' | 'date';

export interface FrontmatterDefaults {
  type: string; // 必須: Graph作成時に使用される
  parent: string; // 必須: すべてのkindで必須。ルートドキュメントは '/' を設定。それ以外は親ドキュメントのIDを設定。テンプレート変数を使用可能
}

export interface ScaffoldTemplateConfig {
  id: string;
  kind: DocumentKind;
  path: string;
  template: string;
  variables?: Record<string, string>;
  frontmatterDefaults?: FrontmatterDefaults;
}

export interface FrontmatterFieldSchema {
  type: FrontmatterFieldType;
  required?: boolean;
  enum?: string[];
  relation?: 'parent' | 'related';
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

// Directory Structure Configuration Types
export interface DirectoryFileDefinition {
  file: string; // ファイル名（プレースホルダー可: "PRD-{FEATURE}.md"）
  template?: string; // テンプレートパス（オプション）
  kind?: string; // ドキュメント種別（オプション: "prd", "beh", "dsg" など）
  type?: string; // コマンド名として使用するタイプ（オプション: "prd", "dsg" など。指定されていない場合は kind を使用）
  rules?: string; // ルールファイルパス（オプション）
  description?: string; // ファイルの説明（オプション）
  prefix?: string; // ファイル名のプレフィックス（オプション）
  variables?: string[]; // 使用される変数（オプション: ["FEATURE", "SUB"]）
  tags?: string[]; // タグ（オプション: ["prd", "feature"]）
  frontmatterDefaults?: FrontmatterDefaults; // フロントマターデフォルト値（オプション）
}

// ディレクトリごとのファイル定義形式
export type DirectoryStructureMap = Record<string, DirectoryFileDefinition[]>;

// ディレクトリ構造の定義（配列形式またはディレクトリごとのファイル定義形式）
export type DirectoryStructure =
  | string[][] // 配列形式: [['product'], ['product', 'features'], ...]
  | DirectoryStructureMap; // ディレクトリごとのファイル定義形式

// 正規化後の型（内部使用）
export type NormalizedDirectoryStructure = DirectoryStructureMap;

// 動的パス処理のオプション
export interface DynamicPathOptions {
  createPlaceholders?: boolean; // プレースホルダーパスを作成するか（デフォルト: true）
  placeholderPrefix?: string; // プレースホルダーのプレフィックス（デフォルト: '__'）
  placeholderSuffix?: string; // プレースホルダーのサフィックス（デフォルト: '__'）
}

export interface EuteloConfig {
  presets?: string[];
  docsRoot?: string;
  directoryStructure?: DirectoryStructure; // 追加
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
  directoryStructure?: NormalizedDirectoryStructure; // 追加（正規化済み）
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
