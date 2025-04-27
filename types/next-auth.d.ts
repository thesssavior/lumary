import NextAuth, { DefaultSession, User as DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      plan: string | null;
    } & DefaultSession['user'];
  }
  interface User extends DefaultUser {
    plan: string | null;
  }
} 