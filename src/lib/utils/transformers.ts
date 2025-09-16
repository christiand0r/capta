export const transformEmptyToUndefined = (v: unknown): unknown => {
  const maybeEmpty = typeof v === "string" && v.trim() === "";

  return maybeEmpty ? undefined : v;
};
