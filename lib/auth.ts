import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT as NextAuthJWT } from "next-auth/jwt";

type UserRole = "student" | "driver" | "admin" | "super_admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: UserRole;
    };
  }

  interface JWT {
    id: string;
    email: string;
    role: UserRole;
  }

  interface User {
    id: string;
    email: string;
    role: UserRole;
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

        // TODO: Verify OTP against database in production
        // For development, use NEXT_PUBLIC_TEST_OTP environment variable
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
          role: credentials.role as UserRole,
        };
      },
    }),
  ],
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async jwt({ token, user }: { token: NextAuthJWT; user?: any }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: NextAuthJWT }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
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
