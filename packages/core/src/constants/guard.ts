export const GUARD_EXIT_CODES = {
  SUCCESS: 0,
  ISSUES_FOUND: 2,
  EXECUTION_ERROR: 3
} as const;

export type GuardExitCode = (typeof GUARD_EXIT_CODES)[keyof typeof GUARD_EXIT_CODES];
