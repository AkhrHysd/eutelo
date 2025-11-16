import path from 'node:path';
import type { FileSystemAdapter } from '@eutelo/infrastructure';
import { FrontmatterParser } from '../doc-lint/frontmatter-parser.js';

export type DocumentType = 'prd' | 'sub-prd' | 'beh' | 'sub-beh' | 'dsg' | 'adr' | 'task' | 'ops';

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

  constructor(dependencies: { fileSystemAdapter: FileSystemAdapter }) {
    this.fileSystemAdapter = dependencies.fileSystemAdapter;
    this.parser = new FrontmatterParser();
  }

  async loadDocuments(documentPaths: string[]): Promise<DocumentLoadResult> {
    const documents: Document[] = [];
    const errors: DocumentLoadError[] = [];

    for (const docPath of documentPaths) {
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

    const documentType = inferDocumentType(docPath, type);
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

function inferDocumentType(filePath: string, frontmatterType: string | undefined): DocumentType | null {
  const fileName = path.basename(filePath);
  const normalizedType = frontmatterType?.toLowerCase().trim();

  if (normalizedType === 'prd' || fileName.match(/^PRD-/i)) {
    return 'prd';
  }
  if (normalizedType === 'sub-prd' || fileName.match(/^SUB-PRD-/i)) {
    return 'sub-prd';
  }
  if (normalizedType === 'beh' || fileName.match(/^BEH-/i)) {
    return 'beh';
  }
  if (normalizedType === 'sub-beh' || fileName.match(/^SUB-BEH-/i)) {
    return 'sub-beh';
  }
  if (normalizedType === 'dsg' || fileName.match(/^DSG-/i)) {
    return 'dsg';
  }
  if (normalizedType === 'adr' || fileName.match(/^ADR-/i)) {
    return 'adr';
  }
  if (normalizedType === 'task' || fileName.match(/^TASK-/i)) {
    return 'task';
  }
  if (normalizedType === 'ops' || fileName.match(/^_template-ops/i)) {
    return 'ops';
  }

  return null;
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

