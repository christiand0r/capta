export const BusinessError = {
  INTERNAL_ERROR: "INTERNAL_ERROR",
  UPSTREAM_FAILURE: "UPSTREAM_FAILURE",
  INVALID_PARAMETERS: "INVALID_PARAMETERS",
} as const;

export type BusinessErrorCode = (typeof BusinessError)[keyof typeof BusinessError];
