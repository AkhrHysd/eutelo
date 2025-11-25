import type {
  EuteloConfigResolved,
  FrontmatterSchemaConfig,
  ScaffoldTemplateConfig
} from './types.js';

/**
 * DocumentType Registry
 * 
 * Config から解決された DocumentType の一覧とメタデータを管理する。
 * scaffold エントリの `kind` を DocumentType として扱う。
 */
export class DocumentTypeRegistry {
  private readonly documentTypes: Set<string>;
  private readonly scaffoldByKind: Map<string, ScaffoldTemplateConfig>;
  private readonly schemaByKind: Map<string, FrontmatterSchemaConfig>;

  constructor(config: EuteloConfigResolved) {
    this.documentTypes = new Set<string>();
    this.scaffoldByKind = new Map<string, ScaffoldTemplateConfig>();
    this.schemaByKind = new Map<string, FrontmatterSchemaConfig>();

    // scaffold エントリから DocumentType を抽出
    for (const scaffold of Object.values(config.scaffold)) {
      const kind = scaffold.kind.toLowerCase();
      this.documentTypes.add(kind);
      this.scaffoldByKind.set(kind, scaffold);
    }

    // frontmatter schemas をマップ
    for (const schema of config.frontmatter.schemas) {
      const kind = schema.kind.toLowerCase();
      this.schemaByKind.set(kind, schema);
    }
  }

  /**
   * Config から解決された DocumentType の一覧を取得
   */
  getDocumentTypes(): string[] {
    return Array.from(this.documentTypes).sort();
  }

  /**
   * 指定された DocumentType が登録されているか確認
   */
  hasDocumentType(type: string): boolean {
    return this.documentTypes.has(type.toLowerCase());
  }

  /**
   * DocumentType に対応する ScaffoldTemplateConfig を取得
   */
  getScaffoldConfig(type: string): ScaffoldTemplateConfig | undefined {
    return this.scaffoldByKind.get(type.toLowerCase());
  }

  /**
   * DocumentType に対応する FrontmatterSchemaConfig を取得
   */
  getFrontmatterSchema(type: string): FrontmatterSchemaConfig | undefined {
    return this.schemaByKind.get(type.toLowerCase());
  }

  /**
   * すべての ScaffoldTemplateConfig を取得
   */
  getAllScaffoldConfigs(): Record<string, ScaffoldTemplateConfig> {
    const result: Record<string, ScaffoldTemplateConfig> = {};
    for (const [kind, scaffold] of this.scaffoldByKind.entries()) {
      result[kind] = scaffold;
    }
    return result;
  }
}

