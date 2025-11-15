import type { LoadedDocument, PromptIntent } from './types.js';

export type PromptBuilderOptions = {
  documents: LoadedDocument[];
  intent?: PromptIntent;
};

export type PromptPayload = {
  systemPrompt: string;
  userPrompt: string;
};

export class PromptBuilder {
  build({ documents, intent }: PromptBuilderOptions): PromptPayload {
    const docSummaries = documents
      .map((doc) => {
        const parent = doc.parent ? `parent=${doc.parent}` : 'parent=none';
        const feature = doc.feature ? `feature=${doc.feature}` : 'feature=unknown';
        return `- [${doc.type}] ${doc.id} (${parent}; ${feature})`;
      })
      .join('\n');
    const docBodies = documents
      .map((doc) => {
        const header = [
          `id: ${doc.id}`,
          `type: ${doc.type}`,
          doc.parent ? `parent: ${doc.parent}` : null,
          doc.feature ? `feature: ${doc.feature}` : null,
          doc.purpose ? `purpose: ${doc.purpose}` : null
        ]
          .filter(Boolean)
          .join('\n');
        return [
          `### ${doc.id}`,
          header,
          '',
          '```markdown',
          doc.content.trim(),
          '```'
        ].join('\n');
      })
      .join('\n\n');

    const taskSection = buildTaskSection(intent);
    const systemPrompt = buildSystemPrompt();

    const userPrompt = [
      'You will receive a set of related Eutelo documentation artifacts.',
      'Each document includes frontmatter (scope, parent, feature) and the markdown body.',
      'Identify any inconsistencies between these documents and classify them.',
      '',
      '## Document Catalog',
      docSummaries || '(none)',
      '',
      '## Documents',
      docBodies || '(no documents provided)',
      '',
      taskSection
    ].join('\n');

    return { systemPrompt, userPrompt };
  }
}

function buildSystemPrompt(): string {
  return [
    'You are Document Guard, an expert reviewer of product documentation.',
    'Eutelo produces PRD, BEH, DSG, ADR, TASK, and OPS documents with strict relationships:',
    '- PRD defines product vision and purpose (parent is usually PRINCIPLE-GLOBAL).',
    '- SUB-PRD refines PRD areas and must remain aligned with parent PRD purpose.',
    '- BEH/SUB-BEH describe behavior scenarios scoped to their PRD/SUB-PRD.',
    '- DSG/SUB-DSG explain design decisions that must fit PRD scope and BEH coverage.',
    '- ADR documents capture architecture decisions linked to specific features.',
    'Each document includes frontmatter fields: id, type, purpose, parent, feature.',
    'Your role is to reason about parent/child relationships, scope coverage, and conflicting purposes.',
    'Respond with clear classification of issues, warnings, and suggestions.'
  ].join('\n');
}

function buildTaskSection(intent?: PromptIntent): string {
  const warnOnlyHint = intent?.warnOnly ? 'Warn-only mode: treat most findings as warnings unless critical.' : '';
  return [
    '## Task',
    '1. List critical inconsistencies (purpose conflicts, missing scope coverage, ADR contradictions, parent mismatches).',
    '2. List warnings for partial misalignments or missing details.',
    '3. Provide suggestions for improvements or follow-up work.',
    '4. Always return JSON with fields: summary, issues[], warnings[], suggestions[].',
    '   Each entry should include id, message, document (path or id), and optional hint.',
    warnOnlyHint
  ]
    .filter(Boolean)
    .join('\n');
}

export function createPromptBuilder(): PromptBuilder {
  return new PromptBuilder();
}
