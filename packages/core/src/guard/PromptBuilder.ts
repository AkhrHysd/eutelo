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
    if (!templatePath) {
      throw new Error('Guard prompt templatePath is required');
    }
    try {
      return await fs.readFile(templatePath, 'utf8');
    } catch (error) {
      const err = error as { code?: string };
      if (err?.code === 'ENOENT') {
        throw new Error(`Guard prompt template not found at ${templatePath}`);
      }
      throw error;
    }
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
