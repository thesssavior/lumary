import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import NaverProvider from "next-auth/providers/naver";
import { supabase } from './lib/supabaseClient';
import crypto from 'crypto';
import type { JWT } from "next-auth/jwt";
import type { Session, User, Account, Profile } from "next-auth";
import type { NextRequest } from 'next/server';

// Function to generate a consistent UUID v5 from Google ID
function generateUUID(googleId: string | undefined) {
  if (typeof googleId !== 'string') {
    throw new Error('Invalid googleId for UUID generation');
  }
  // Use a consistent namespace UUID (can be any valid UUID)
  const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  return crypto.createHash('sha1')
    .update(NAMESPACE + googleId)
    .digest('hex')
    .substring(0, 32)
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

const baseAuthOptions = {
  // Use NEXTAUTH_SECRET or fallback to legacy AUTH_SECRET
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  trustHost: true,
  // Custom logger to suppress PKCE/CSRF spam in production logs
  logger: {
    error(error: Error) {
      // Suppress PKCE state and CSRF missing errors
      if (error.name === 'InvalidCheck' || error.name === 'MissingCSRF') return;
      console.error('[auth][error]', error);
    }
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      // Use GOOGLE_CLIENT_SECRET or fallback to legacy AUTH_GOOGLE_SECRET
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET!,
    }),
    // NaverProvider({
    //   clientId: process.env.NAVER_CLIENT_ID!,
    //   clientSecret: process.env.NAVER_CLIENT_SECRET || process.env.AUTH_NAVER_SECRET!,
    // }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile, trigger, isNewUser, session }: {
      token: JWT;
      user?: User | null;
      account?: Account | null;
      profile?: Profile;
      trigger?: "signIn" | "signUp" | "update";
      isNewUser?: boolean;
      session?: any;
    }) {
      if (account?.providerAccountId) {
        token.userId = generateUUID(account.providerAccountId);
      }
      return token;
    },
    async session({ session, token, user }: {
      session: Session;
      token: JWT;
      user?: User | null;
    }) {
      if (session?.user && token.userId) {
        session.user.id = token.userId as string;
        // Fetch the user's plan from Supabase
        const { data, error } = await supabase
          .from('users')
          .select('plan')
          .eq('id', token.userId)
          .single();
        if (!error && data?.plan) {
          session.user.plan = data.plan;
        } else {
          session.user.plan = 'free';
        }
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
  events: {
    async signIn({ user, account }: { user: User; account?: Account | null }) {
      try {
        if (!account || typeof account.providerAccountId !== 'string') {
          throw new Error('Missing providerAccountId');
        }
        const userId = generateUUID(account.providerAccountId as string);
        
        // Upsert user record into Supabase with consistent UUID
        const { error: userError } = await supabase.from('users').upsert({
          id: userId,
          email: user.email,
          name: user.name
        });
        if (userError) console.error('Supabase upsert user error:', userError.message);

        // Ensure default folder exists
        const { data: existingFolders, error: fetchErr } = await supabase
          .from('folders')
          .select('id')
          .eq('user_id', userId);
        if (fetchErr) console.error('Fetch folders error:', fetchErr.message);

        if (!existingFolders?.length) {
          const { error: folderErr } = await supabase.from('folders').insert({
            user_id: userId,
            name: 'My Folder',
          });
          if (folderErr) console.error('Default folder creation failed:', folderErr.message);
        }
      } catch (error) {
        console.error('Error signing in:', error);
      }
    }
  }
};

// Use lazy initialization to inspect headers
const { handlers, auth, signIn, signOut } = NextAuth((req: NextRequest | undefined) => {
  return baseAuthOptions; // Return the static options
});

export { baseAuthOptions as authOptions, handlers, auth, signIn, signOut };
