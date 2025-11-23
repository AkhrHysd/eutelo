import { promises as fs } from 'node:fs';
import pathModule from 'node:path';

type NodeFsError = Error & { code?: string };

export type TemplateServiceOptions = {
  templateRoot: string;
  overrideRoot?: string;
};

export type TemplateVariables = Record<string, string>;

export class TemplateNotFoundError extends Error {
  readonly templateName: string;
  readonly filePath: string;

  constructor(templateName: string, filePath?: string) {
    super(`Template not found: ${templateName}`);
    this.name = 'TemplateNotFoundError';
    this.templateName = templateName;
    this.filePath = filePath ?? templateName;
  }
}

export class TemplateService {
  private readonly templateRoot: string;
  private readonly overrideRoot?: string;
  private readonly path: any;

  constructor({ templateRoot, overrideRoot }: TemplateServiceOptions) {
    this.templateRoot = templateRoot;
    this.overrideRoot = overrideRoot;
    this.path = pathModule as any;
  }

  async render(templateName: string, variables: TemplateVariables): Promise<string> {
    const templatePath = this.resolveTemplatePath(templateName);
    let content: string;
    try {
      content = await fs.readFile(templatePath, 'utf8');
    } catch (error) {
      const nodeError = error as NodeFsError;
      if (nodeError?.code === 'ENOENT') {
        throw new TemplateNotFoundError(templateName, templatePath);
      }
      throw error;
    }

    return this.applyVariables(content, variables);
  }

  private applyVariables(template: string, variables: TemplateVariables): string {
    let output = template;
    for (const [key, value] of Object.entries(variables)) {
      const normalizedValue = value ?? '';
      const pattern = new RegExp(`\\{${key}\\}`, 'g');
      output = output.replace(pattern, normalizedValue);
    }
    return output;
  }

  private resolveTemplatePath(templateName: string): string {
    const path = this.path;
    if (templateName.startsWith('.')) {
      return path.resolve(process.cwd(), templateName);
    }

    if (this.overrideRoot) {
      const fileName = path.basename(templateName);
      return path.resolve(this.overrideRoot, fileName);
    }

    if (path.isAbsolute(templateName)) {
      return templateName;
    }

    return path.resolve(this.templateRoot, templateName);
  }
}
