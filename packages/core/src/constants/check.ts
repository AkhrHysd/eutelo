export const CHECK_EXIT_CODES = {
  SUCCESS: 0,
  VALIDATION_ERROR: 2,
  ERROR: 1
} as const;

export type CheckExitCode = (typeof CHECK_EXIT_CODES)[keyof typeof CHECK_EXIT_CODES];
