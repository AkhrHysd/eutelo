import path from 'node:path';
import type { FileSystemAdapter } from '@eutelo/infrastructure';
import { FrontmatterParser } from '../doc-lint/frontmatter-parser.js';
import type { FrontmatterSchemaConfig, ScaffoldTemplateConfig } from '../config/types.js';

export type DocumentType = string;

export type Document = {
  path: string;
  type: DocumentType;
  id: string;
  parent?: string;
  feature?: string;
  purpose?: string;
  content: string;
};

export type DocumentLoadError = {
  path: string;
  message: string;
};

export type DocumentLoadResult = {
  documents: Document[];
  errors: DocumentLoadError[];
};

export class DocumentLoader {
  private readonly fileSystemAdapter: FileSystemAdapter;
  private readonly parser: FrontmatterParser;
  private readonly typeMatchers: Array<{ kind: string; regex: RegExp }>;

  constructor(dependencies: {
    fileSystemAdapter: FileSystemAdapter;
    allowedFields?: string[];
    frontmatterSchemas?: FrontmatterSchemaConfig[];
    scaffold?: Record<string, ScaffoldTemplateConfig>;
  }) {
    const { fileSystemAdapter, allowedFields, frontmatterSchemas, scaffold } = dependencies;
    this.fileSystemAdapter = fileSystemAdapter;
    this.parser = new FrontmatterParser({
      allowedFields: buildAllowedFields(allowedFields, frontmatterSchemas)
    });
    this.typeMatchers = buildTypeMatchers(scaffold);
  }

  async loadDocuments(documentPaths: string[]): Promise<DocumentLoadResult> {
    const documents: Document[] = [];
    const errors: DocumentLoadError[] = [];

    for (const docPath of documentPaths) {
      // Skip README files and template files
      if (shouldSkipDocument(docPath)) {
        continue;
      }

      try {
        const document = await this.loadDocument(docPath);
        if (document) {
          documents.push(document);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ path: docPath, message });
      }
    }

    return { documents, errors };
  }

  private async loadDocument(docPath: string): Promise<Document | null> {
    const exists = await this.fileSystemAdapter.exists(docPath);
    if (!exists) {
      throw new Error(`File not found: ${docPath}`);
    }

    const content = await this.fileSystemAdapter.readFile(docPath);
    const { frontmatter, issues } = this.parser.parse(content);

    if (!frontmatter) {
      throw new Error(`Failed to parse frontmatter: ${issues.map((i) => i.message).join(', ')}`);
    }

    const id = frontmatter.id;
    const type = frontmatter.type;
    const parent = frontmatter.parent;
    const feature = frontmatter.feature;
    const purpose = frontmatter.purpose;

    if (!id || !type) {
      throw new Error(`Missing required fields: id=${id}, type=${type}`);
    }

    const documentType = inferDocumentType(docPath, type, this.typeMatchers);
    if (!documentType) {
      throw new Error(`Unknown document type: ${type}`);
    }

    const contentWithoutFrontmatter = extractContentWithoutFrontmatter(content);

    return {
      path: docPath,
      type: documentType,
      id,
      parent,
      feature,
      purpose,
      content: contentWithoutFrontmatter
    };
  }
}

function inferDocumentType(
  filePath: string,
  frontmatterType: string | undefined,
  matchers: Array<{ kind: string; regex: RegExp }>
): DocumentType | null {
  const normalizedType = frontmatterType?.toLowerCase().trim();
  if (normalizedType) {
    return normalizedType;
  }
  const relative = normalizeRelativePath(filePath);
  const matched = matchers.find((candidate) => candidate.regex.test(relative));
  if (matched) {
    return matched.kind;
  }
  return null;
}

function shouldSkipDocument(docPath: string): boolean {
  const fileName = path.basename(docPath).toLowerCase();
  const dirName = path.dirname(docPath).toLowerCase();

  // Skip README files
  if (fileName === 'readme.md') {
    return true;
  }

  // Skip template files
  if (fileName.startsWith('_template-')) {
    return true;
  }

  // Skip files in philosophy directory (vision, principles, etc.)
  if (dirName.includes('philosophy')) {
    return true;
  }

  return false;
}

function extractContentWithoutFrontmatter(content: string): string {
  const lines = content.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === '---');
  if (startIndex === -1) {
    return content;
  }

  const endIndex = lines.findIndex((line, index) => index > startIndex && line.trim() === '---');
  if (endIndex === -1) {
    return content;
  }

  return lines.slice(endIndex + 1).join('\n').trim();
}

function buildAllowedFields(
  explicit?: string[],
  schemas?: FrontmatterSchemaConfig[]
): string[] | undefined {
  if (explicit && explicit.length > 0) {
    return explicit;
  }
  if (!schemas) {
    return undefined;
  }
  const fields = new Set<string>(['id', 'type', 'feature', 'purpose', 'parent']);
  for (const schema of schemas) {
    for (const fieldName of Object.keys(schema.fields ?? {})) {
      if (fieldName) {
        fields.add(fieldName);
      }
    }
  }
  return Array.from(fields);
}

function buildTypeMatchers(scaffold?: Record<string, ScaffoldTemplateConfig>): Array<{ kind: string; regex: RegExp }> {
  if (!scaffold) {
    return [];
  }
  const matchers: Array<{ kind: string; regex: RegExp }> = [];
  for (const entry of Object.values(scaffold)) {
    if (!entry?.path || !entry.kind) {
      continue;
    }
    matchers.push({ kind: entry.kind.toLowerCase(), regex: templateToRegex(entry.path) });
  }
  return matchers;
}

function templateToRegex(template: string): RegExp {
  let pattern = '';
  let lastIndex = 0;
  const placeholder = /\{[A-Z0-9_-]+\}/gi;
  let match: RegExpExecArray | null;
  while ((match = placeholder.exec(template)) !== null) {
    if (match.index > lastIndex) {
      pattern += escapeRegExp(template.slice(lastIndex, match.index));
    }
    pattern += '[^/]+';
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < template.length) {
    pattern += escapeRegExp(template.slice(lastIndex));
  }
  return new RegExp(pattern, 'i');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeRelativePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}
