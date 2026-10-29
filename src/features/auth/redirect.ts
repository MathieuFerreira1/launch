// Keep post-login navigation on the current origin, including backslash normalization.
export function safeReturnPath(value: string | null, origin: string): string {
  if (!value?.startsWith("/")) return "/app";
  try {
    const target = new URL(value, origin);
    if (target.origin !== origin || target.pathname.startsWith("/auth"))
      return "/app";
    return target.pathname + target.search + target.hash;
  } catch {
    return "/app";
  }
}
