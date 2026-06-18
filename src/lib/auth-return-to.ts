// Helper to remember where the user was before being sent to the login/auth page,
// so AuthPage can return them there after a successful sign-in.

export function rememberReturnTo(path?: string): string {
  if (typeof window === "undefined") return "/";
  const p =
    path ??
    (window.location.pathname + window.location.search + window.location.hash);
  const authPaths = ["/auth", "/login", "/register", "/forgot-password", "/reset-password"];
  const pathname = p.split("?")[0].split("#")[0];
  const isSafe =
    p.startsWith("/") &&
    !p.startsWith("//") &&
    !authPaths.some((a) => pathname === a || pathname.startsWith(a + "/"));
  if (!isSafe) return "/";
  try {
    window.sessionStorage.setItem("auth:returnTo", p);
  } catch { /* ignore */ }
  return p;
}
