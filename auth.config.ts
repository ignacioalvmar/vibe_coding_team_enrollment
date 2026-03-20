import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { normalizeThiEmail } from "@/lib/thi-email";

export default {
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      authorize(credentials) {
        const raw = credentials?.email;
        if (typeof raw !== "string") return null;
        const email = normalizeThiEmail(raw);
        if (!email) return null;
        return { id: email, email };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (path.startsWith("/api")) return true;
      if (path.startsWith("/enroll")) return !!auth?.user?.email;
      return true;
    },
    jwt({ token, user }) {
      if (user?.email) token.email = user.email;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
