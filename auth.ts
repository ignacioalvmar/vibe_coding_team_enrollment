import NextAuth from "next-auth";
import authConfig from "@/auth.config";

/** Auth.js requires a secret for JWT/session; set AUTH_SECRET in .env (see README). */
function authSecret(): string | undefined {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "development")
    return "dev-only-auth-secret-not-for-production";
  return undefined;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  secret: authSecret(),
});
