/**
 * Returns a safe same-origin path for post-login redirects.
 *
 * Args:
 *   next (string | null): Requested redirect path from query or form.
 *
 * Returns:
 *   string: Path starting with `/` and not protocol-relative.
 */
export function getSafeRedirectPath(next: string | null): string {
  if (!next || !next.startsWith("/")) {
    return "/";
  }
  if (next.startsWith("//")) {
    return "/";
  }
  return next;
}
