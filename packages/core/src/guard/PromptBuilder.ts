import fs from 'node:fs/promises';
import type { GuardPromptConfig } from '../config/types.js';
import type { Document } from './DocumentLoader.js';

export type PromptOptions = {
  documents: Document[];
  promptConfig?: GuardPromptConfig;
  japanese?: boolean;
};

export class PromptBuilder {
  async buildPrompt(options: PromptOptions): Promise<{ systemPrompt: string; userPrompt: string }> {
    const { documents, promptConfig, japanese } = options;

    const systemPrompt = await this.buildSystemPrompt(promptConfig?.templatePath, japanese);
    const userPrompt = this.buildUserPrompt(documents, japanese);

    return { systemPrompt, userPrompt };
  }

  private async buildSystemPrompt(templatePath?: string, japanese?: boolean): Promise<string> {
    if (!templatePath) {
      throw new Error('Guard prompt templatePath is required');
    }
    try {
      let systemPrompt = await fs.readFile(templatePath, 'utf8');
      
      // Add Japanese output instruction if requested
      if (japanese) {
        systemPrompt += '\n\n**IMPORTANT: Output Language**\nYou MUST respond in Japanese. All issue messages, warnings, and suggestions must be written in Japanese.';
      }
      
      return systemPrompt;
    } catch (error) {
      const err = error as { code?: string };
      if (err?.code === 'ENOENT') {
        throw new Error(`Guard prompt template not found at ${templatePath}`);
      }
      throw error;
    }
  }

  private buildUserPrompt(documents: Document[], japanese?: boolean): string {
    // Build a map of documents by ID for quick lookup
    const documentsById = new Map<string, Document>();
    for (const doc of documents) {
      documentsById.set(doc.id, doc);
    }

    // Group documents by parent-child relationships
    const rootDocuments: Document[] = [];
    const childDocumentsByParent = new Map<string, Document[]>();
    const processedDocIds = new Set<string>();

    // First pass: categorize documents
    // Note: A document is considered a root if:
    // 1. It has no parent field
    // 2. Its parent is '/' (root indicator)
    // 3. Its parent ID is not in the provided documents set
    // Otherwise, it's a child document
    for (const doc of documents) {
      if (!doc.parent || doc.parent === '/') {
        rootDocuments.push(doc);
      } else if (documentsById.has(doc.parent)) {
        // Parent is in the set, so this is a child
        const parentId = doc.parent;
        if (!childDocumentsByParent.has(parentId)) {
          childDocumentsByParent.set(parentId, []);
        }
        childDocumentsByParent.get(parentId)!.push(doc);
      } else {
        // Parent is not in the set, treat as root for now
        rootDocuments.push(doc);
      }
    }

    // Build document sections with explicit parent-child relationships
    const documentSections: string[] = [];
    const parentChildPairs: Array<{ parent: Document; children: Document[] }> = [];

    // Add root documents and their children
    for (const rootDoc of rootDocuments) {
      if (processedDocIds.has(rootDoc.id)) continue;
      
      const children = childDocumentsByParent.get(rootDoc.id) || [];
      if (children.length > 0) {
        parentChildPairs.push({ parent: rootDoc, children });
      }
      
      const section = this.formatDocumentSection(rootDoc, 'ROOT');
      documentSections.push(section);
      processedDocIds.add(rootDoc.id);

      for (const child of children) {
        if (processedDocIds.has(child.id)) continue;
        
        const parentPath = rootDoc.path;
        const childSection = this.formatDocumentSection(child, `CHILD of ${rootDoc.id} (${parentPath})`);
        documentSections.push(childSection);
        processedDocIds.add(child.id);
      }
    }

    // Add any remaining documents that have parents in the set
    for (const doc of documents) {
      if (processedDocIds.has(doc.id)) continue;
      
      if (doc.parent && doc.parent !== '/' && documentsById.has(doc.parent)) {
        const parentDoc = documentsById.get(doc.parent)!;
        if (!parentChildPairs.some(pair => pair.parent.id === parentDoc.id)) {
          parentChildPairs.push({ parent: parentDoc, children: [doc] });
        }
        const section = this.formatDocumentSection(doc, `CHILD of ${doc.parent} (${parentDoc.path})`);
        documentSections.push(section);
        processedDocIds.add(doc.id);
      }
    }

    // Add any remaining standalone documents
    for (const doc of documents) {
      if (processedDocIds.has(doc.id)) continue;
      
      const relationship = doc.parent ? `CHILD of ${doc.parent} (parent not in set)` : 'STANDALONE';
      const section = this.formatDocumentSection(doc, relationship);
      documentSections.push(section);
      processedDocIds.add(doc.id);
    }

    // Build relationship summary
    let relationshipSummary = '';
    if (parentChildPairs.length > 0) {
      const pairs = parentChildPairs.map(pair => {
        const childrenIds = pair.children.map(c => c.id).join(', ');
        return `- ${pair.parent.id} (${pair.parent.path}) → [${childrenIds}]`;
      }).join('\n');
      
      relationshipSummary = japanese
        ? `\n\n**親子関係の要約:**\n以下の親子関係が検出されました。親ドキュメントと子ドキュメントの内容を比較して整合性を確認してください。\n${pairs}\n`
        : `\n\n**Parent-Child Relationship Summary:**\nThe following parent-child relationships were detected. Please compare the content of parent and child documents to verify consistency.\n${pairs}\n`;
    }

    const instruction = japanese
      ? '以下のドキュメントの整合性を分析してください。親子関係に特に注意し、子ドキュメントの内容が親ドキュメントの目的、スコープ、要件と一致していることを確認してください。'
      : 'Please analyze the following documents for consistency issues. Pay special attention to parent-child relationships and verify that child document content aligns with their parent documents\' purpose, scope, and requirements.';
    
    return `${instruction}${relationshipSummary}\n${documentSections.join('\n\n---\n\n')}`;
  }

  private formatDocumentSection(doc: Document, relationship: string): string {
    const metadata = [
      `Path: ${doc.path}`,
      `Type: ${doc.type}`,
      `ID: ${doc.id}`,
      `Relationship: ${relationship}`,
      doc.parent ? `Parent ID: ${doc.parent}` : null,
      doc.feature ? `Feature: ${doc.feature}` : null,
      doc.purpose ? `Purpose: ${doc.purpose}` : null
    ]
      .filter((line) => line !== null)
      .join('\n');

    return `---\n${metadata}\n---\n\n${doc.content}`;
  }
}
