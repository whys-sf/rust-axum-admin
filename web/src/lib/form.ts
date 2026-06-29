export function fieldError(meta: { errors?: Array<unknown> }): string | undefined {
  const first = meta.errors?.[0];
  if (!first) return undefined;
  if (typeof first === "string") return first;
  if (typeof first === "object" && first !== null && "message" in first) {
    const message = (first as { message?: unknown }).message;
    return typeof message === "string" ? message : undefined;
  }
  return undefined;
}
