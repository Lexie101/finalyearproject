import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: "student" | "driver" | "admin" | "super_admin";
    };
  }

  interface JWT {
    id: string;
    email: string;
    role: "student" | "driver" | "admin" | "super_admin";
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        role: { label: "Role", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.role || !credentials?.otp) {
          throw new Error("Missing credentials");
        }

        // Verify OTP (in production, check against stored OTP)
        const storedOtp = process.env.NEXT_PUBLIC_TEST_OTP || "123456";
        if (credentials.otp !== storedOtp) {
          throw new Error("Invalid OTP");
        }

        // Validate student email format
        if (credentials.role === "student") {
          const studentRegex =
            /^[A-Za-z]{2,3}\d{6,8}@students\.cavendish\.co\.zm$/;
          if (!studentRegex.test(credentials.email)) {
            throw new Error("Invalid student email format");
          }
        }

        return {
          id: credentials.email,
          email: credentials.email,
          role: credentials.role as "student" | "driver" | "admin",
        };
      },
    }),
  ],
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    // @ts-expect-error - NextAuth JWT callback type mismatch
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        // @ts-expect-error - role property not in default User type
        token.role = user.role;
      }
      return token;
    },
    // @ts-expect-error - NextAuth session callback type mismatch
    async session({ session, token }) {
      if (session.user) {
        // @ts-expect-error - adding custom fields to session.user
        session.user.id = token.id;
        // @ts-expect-error - adding custom fields to session.user
        session.user.email = token.email;
        // @ts-expect-error - adding custom fields to session.user
        session.user.role = token.role;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key",
};
