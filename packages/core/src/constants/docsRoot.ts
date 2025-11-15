const DEFAULT_DOCS_ROOT = 'eutelo-docs';

export type DocsRootResolverEnv = { EUTELO_DOCS_ROOT?: string };

export function resolveDocsRoot(env: DocsRootResolverEnv = process.env): string {
  const override = env?.EUTELO_DOCS_ROOT;
  if (override && override.trim().length > 0) {
    return override.trim();
  }
  return DEFAULT_DOCS_ROOT;
}

export { DEFAULT_DOCS_ROOT };
