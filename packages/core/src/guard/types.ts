export type GuardDocumentType =
  | 'prd'
  | 'sub-prd'
  | 'beh'
  | 'sub-beh'
  | 'dsg'
  | 'sub-dsg'
  | 'adr'
  | 'task'
  | 'ops';

export type LoadedDocument = {
  /**
   * Relative path from the workspace root (cwd).
   */
  path: string;
  /**
   * Absolute path used for file system access.
   */
  absolutePath: string;
  /**
   * Canonical document identifier (e.g. PRD-DOC-GUARD).
   */
  id: string;
  /**
   * Optional parent identifier.
   */
  parent?: string;
  /**
   * Feature identifier (e.g. doc-guard).
   */
  feature?: string;
  /**
   * Purpose / goal statement extracted from frontmatter.
   */
  purpose?: string;
  /**
   * Declared document type.
   */
  type: GuardDocumentType;
  /**
   * Raw body content excluding the frontmatter header.
   */
  content: string;
  /**
   * Entire parsed frontmatter for future use.
   */
  frontmatter: Record<string, string>;
};

export type PromptIntent = {
  format?: 'text' | 'json';
  warnOnly?: boolean;
  failOnError?: boolean;
};
