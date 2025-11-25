import { promises as fs } from 'node:fs';
import pathModule from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

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

    const rendered = this.applyVariables(content, variables);
    return this.applyFrontmatterDefaults(rendered, variables);
  }

  private applyFrontmatterDefaults(
    content: string,
    variables: TemplateVariables
  ): string {
    // frontmatter セクションを抽出
    const frontmatterMatch = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatterMatch) {
      return content;
    }

    const frontmatterContent = frontmatterMatch[1];
    let frontmatter: Record<string, unknown>;
    try {
      frontmatter = parseYaml(frontmatterContent) as Record<string, unknown>;
    } catch (error) {
      // YAML パースエラーの場合は既存のパーサーを使用
      frontmatter = this.parseFrontmatterBlock(frontmatterContent.split(/\r?\n/));
    }

    // 空の値を持つフィールドを削除
    for (const [key, value] of Object.entries(frontmatter)) {
      if (value === '' || value === null || value === undefined) {
        delete frontmatter[key];
      }
      // 配列の場合、空配列も削除
      if (Array.isArray(value) && value.length === 0) {
        delete frontmatter[key];
      }
    }

    // frontmatterDefaults の値で上書き（TYPE と PARENT が variables に含まれている場合のみ）
    if (variables.TYPE) {
      frontmatter.type = variables.TYPE;
    }
    if (variables.PARENT) {
      frontmatter.parent = variables.PARENT;
    }

    // frontmatter を再構築
    try {
      const updatedFrontmatter = stringifyYaml(frontmatter, {
        lineWidth: 0,
        minContentWidth: 0
      }).trim();
      return content.replace(frontmatterMatch[0], `---\n${updatedFrontmatter}\n---`);
    } catch (error) {
      // stringify エラーの場合は元のコンテンツを返す
      return content;
    }
  }

  private parseFrontmatterBlock(lines: string[]): Record<string, string> {
    const parsed: Record<string, string> = {};
    let captureKey: string | null = null;
    let captureBuffer: string[] = [];

    for (let index = 0; index <= lines.length; index++) {
      const line = index < lines.length ? lines[index] : undefined;
      if (captureKey) {
        if (line === undefined) {
          parsed[captureKey] = captureBuffer.join('\n').trim();
          break;
        }
        if (line.trim() === '' || /^[\t ]/.test(line)) {
          captureBuffer.push(line.trim());
          continue;
        }
        parsed[captureKey] = captureBuffer.join('\n').trim();
        captureKey = null;
        captureBuffer = [];
        index--;
        continue;
      }

      if (line === undefined) {
        break;
      }

      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) {
        continue;
      }

      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      if (value === '' || value.startsWith('>') || value.startsWith('|')) {
        captureKey = key;
        captureBuffer = [value];
      } else {
        parsed[key] = value;
      }
    }

    return parsed;
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
