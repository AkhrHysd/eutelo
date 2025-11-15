export type ParsedFrontmatter = Record<string, string>;

export type ParsedMarkdown = {
  frontmatter: ParsedFrontmatter;
  body: string;
};

export function parseMarkdown(content: string): ParsedMarkdown {
  if (typeof content !== 'string' || content.trim().length === 0) {
    return { frontmatter: {}, body: '' };
  }
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error('Document is missing frontmatter header.');
  }
  const [, frontmatterBlock, body = ''] = match;
  return {
    frontmatter: parseFrontmatterBlock(frontmatterBlock ?? ''),
    body: body.trim()
  };
}

function parseFrontmatterBlock(block: string): ParsedFrontmatter {
  const lines = block.split(/\r?\n/);
  const parsed: ParsedFrontmatter = {};
  let captureKey: string | null = null;
  let captureBuffer: string[] = [];
  for (let index = 0; index <= lines.length; index += 1) {
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
      index -= 1;
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
    const rawValue = line.slice(colonIndex + 1).trim();
    if (!key) {
      continue;
    }
    if (rawValue === '>' || rawValue === '|') {
      captureKey = key;
      captureBuffer = [];
      continue;
    }
    if (!rawValue) {
      continue;
    }
    parsed[key] = stripQuotes(rawValue);
  }
  return parsed;
}

function stripQuotes(value: string): string {
  if (value.length >= 2) {
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
  }
  return value;
}
