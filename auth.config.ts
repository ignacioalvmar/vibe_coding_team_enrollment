import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getUserById, verifyUserCredentials } from "@/lib/users";

export default {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }
        const user = await verifyUserCredentials(email, password);
        if (!user) return null;
        return {
          id: String(user.id),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
        };
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
      if (
        path.startsWith("/enroll") ||
        path.startsWith("/profile") ||
        path.startsWith("/admin")
      ) {
        return !!auth?.user?.email;
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        const dbUser = await getUserById(Number(user.id));
        token.isAdmin = dbUser?.isAdmin ?? false;
      }
      if (trigger === "update" && session && typeof session === "object") {
        const s = session as { name?: string };
        if (typeof s.name === "string") token.name = s.name;
      }
      if (trigger === "update" && token.id) {
        const dbUser = await getUserById(Number(token.id));
        if (dbUser) token.isAdmin = dbUser.isAdmin;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.id) session.user.id = token.id as string;
        if (token.email) session.user.email = token.email as string;
        if (token.name !== undefined) session.user.name = token.name as string | null;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
