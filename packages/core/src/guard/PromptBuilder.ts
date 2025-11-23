import fs from 'node:fs/promises';
import type { GuardPromptConfig } from '../config/types.js';
import type { Document } from './DocumentLoader.js';

export type PromptOptions = {
  documents: Document[];
  promptConfig?: GuardPromptConfig;
};

export class PromptBuilder {
  async buildPrompt(options: PromptOptions): Promise<{ systemPrompt: string; userPrompt: string }> {
    const { documents, promptConfig } = options;

    const systemPrompt = await this.buildSystemPrompt(promptConfig?.templatePath);
    const userPrompt = this.buildUserPrompt(documents);

    return { systemPrompt, userPrompt };
  }

  private async buildSystemPrompt(templatePath?: string): Promise<string> {
    if (templatePath) {
      try {
        return await fs.readFile(templatePath, 'utf8');
      } catch (error) {
        const err = error as { code?: string };
        if (err?.code !== 'ENOENT') {
          throw error;
        }
      }
    }
    return `You are a documentation consistency checker for the Eutelo documentation system.

Eutelo uses a structured documentation system with the following document types:
- PRD (Product Requirements Document): Defines what the product should do
- BEH (Behavior Specification): Defines how the product behaves
- DSG (Design Specification Guide): Defines the technical design
- ADR (Architecture Decision Record): Records architectural decisions
- TASK: Implementation task breakdown
- OPS: Operational runbooks

Key relationships:
- PRD and BEH should have consistent purpose and scope
- BEH should cover all scenarios mentioned in PRD
- DSG should align with PRD's scope
- ADR decisions should not contradict PRD/BEH/DSG
- Documents reference each other via "parent" field

Your task is to analyze the provided documents and identify:
1. Purpose conflicts between related documents (especially PRD ↔ BEH)
2. Scope gaps (e.g., PRD mentions features not covered in BEH)
3. ADR conflicts (ADR decisions contradicting PRD/BEH/DSG)
4. Parent relationship inconsistencies
5. Document role violations (e.g., PRD containing implementation details)

Respond in JSON format with the following structure:
{
  "issues": [
    {
      "id": "ISSUE-001",
      "document": "path/to/document.md",
      "message": "Description of the issue",
      "type": "purpose-conflict" | "scope-gap" | "adr-conflict" | "parent-inconsistency" | "role-violation"
    }
  ],
  "warnings": [
    {
      "id": "WARN-001",
      "document": "path/to/document.md",
      "message": "Description of the warning"
    }
  ],
  "suggestions": [
    {
      "id": "SUGGEST-001",
      "document": "path/to/document.md",
      "message": "Improvement suggestion"
    }
  ]
}

If no issues are found, return empty arrays.`;
  }

  private buildUserPrompt(documents: Document[]): string {
    const documentSections = documents.map((doc) => {
      const metadata = [
        `Path: ${doc.path}`,
        `Type: ${doc.type}`,
        `ID: ${doc.id}`,
        doc.parent ? `Parent: ${doc.parent}` : null,
        doc.feature ? `Feature: ${doc.feature}` : null,
        doc.purpose ? `Purpose: ${doc.purpose}` : null
      ]
        .filter((line) => line !== null)
        .join('\n');

      return `---\n${metadata}\n---\n\n${doc.content}`;
    });

    return `Please analyze the following documents for consistency issues:\n\n${documentSections.join('\n\n---\n\n')}`;
  }
}
