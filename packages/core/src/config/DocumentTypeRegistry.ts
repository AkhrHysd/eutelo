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
  private readonly normalizedToKind: Map<string, string>;

  constructor(config: EuteloConfigResolved) {
    this.documentTypes = new Set<string>();
    this.scaffoldByKind = new Map<string, ScaffoldTemplateConfig>();
    this.schemaByKind = new Map<string, FrontmatterSchemaConfig>();
    this.normalizedToKind = new Map<string, string>();

    // scaffold エントリから DocumentType を抽出
    for (const scaffold of Object.values(config.scaffold)) {
      const kind = scaffold.kind.toLowerCase();
      this.documentTypes.add(kind);
      this.scaffoldByKind.set(kind, scaffold);
      
      // 正規化された値もマッピング（sub-beh -> sub-behavior など）
      const normalized = normalizeDocumentKind(kind);
      if (normalized !== kind) {
        this.normalizedToKind.set(normalized, kind);
      }
    }

    // frontmatter schemas をマップ
    for (const schema of config.frontmatter.schemas) {
      const kind = schema.kind.toLowerCase();
      this.schemaByKind.set(kind, schema);
      
      // 正規化された値もマッピング
      const normalized = normalizeDocumentKind(kind);
      if (normalized !== kind) {
        this.normalizedToKind.set(normalized, kind);
      }
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
   * 正規化された値（sub-behavior -> sub-beh など）もチェックする
   */
  hasDocumentType(type: string): boolean {
    const normalized = type.toLowerCase();
    if (this.documentTypes.has(normalized)) {
      return true;
    }
    // 正規化された値でチェック（sub-beh -> sub-behavior）
    const normalizedKind = normalizeDocumentKind(normalized);
    if (this.documentTypes.has(normalizedKind)) {
      return true;
    }
    // 逆方向のマッピングもチェック（sub-behavior -> sub-beh）
    const mappedKind = this.normalizedToKind.get(normalized);
    if (mappedKind && this.documentTypes.has(mappedKind)) {
      return true;
    }
    // さらに、逆方向の正規化もチェック（sub-behavior -> sub-beh）
    const denormalizedKind = denormalizeDocumentKind(normalized);
    if (denormalizedKind !== normalized && this.documentTypes.has(denormalizedKind)) {
      return true;
    }
    return false;
  }

  /**
   * DocumentType に対応する ScaffoldTemplateConfig を取得
   */
  getScaffoldConfig(type: string): ScaffoldTemplateConfig | undefined {
    const normalized = type.toLowerCase();
    let scaffold = this.scaffoldByKind.get(normalized);
    if (scaffold) {
      return scaffold;
    }
    // 正規化された値で検索
    const normalizedKind = normalizeDocumentKind(normalized);
    scaffold = this.scaffoldByKind.get(normalizedKind);
    if (scaffold) {
      return scaffold;
    }
    // 逆方向のマッピングで検索
    const mappedKind = this.normalizedToKind.get(normalized);
    if (mappedKind) {
      return this.scaffoldByKind.get(mappedKind);
    }
    return undefined;
  }

  /**
   * DocumentType に対応する FrontmatterSchemaConfig を取得
   */
  getFrontmatterSchema(type: string): FrontmatterSchemaConfig | undefined {
    const normalized = type.toLowerCase();
    let schema = this.schemaByKind.get(normalized);
    if (schema) {
      return schema;
    }
    // 正規化された値で検索
    const normalizedKind = normalizeDocumentKind(normalized);
    schema = this.schemaByKind.get(normalizedKind);
    if (schema) {
      return schema;
    }
    // 逆方向のマッピングで検索
    const mappedKind = this.normalizedToKind.get(normalized);
    if (mappedKind) {
      return this.schemaByKind.get(mappedKind);
    }
    return undefined;
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

/**
 * DocumentKind を正規化する（sub-beh -> sub-behavior など）
 */
function normalizeDocumentKind(value: string): string {
  if (!value) return '';
  const normalized = value.toLowerCase();
  if (normalized === 'beh') return 'behavior';
  if (normalized === 'sub-beh') return 'sub-behavior';
  if (normalized === 'dsg') return 'design';
  if (normalized === 'sub-dsg') return 'sub-design';
  return normalized;
}

/**
 * DocumentKind を非正規化する（sub-behavior -> sub-beh など）
 */
function denormalizeDocumentKind(value: string): string {
  if (!value) return '';
  const normalized = value.toLowerCase();
  if (normalized === 'behavior') return 'beh';
  if (normalized === 'sub-behavior') return 'sub-beh';
  if (normalized === 'design') return 'dsg';
  if (normalized === 'sub-design') return 'sub-dsg';
  return normalized;
}

