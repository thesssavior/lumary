import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import NaverProvider from "next-auth/providers/naver";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from './lib/supabaseClient';
import crypto from 'crypto';
import type { JWT } from "next-auth/jwt";
import type { Session, User, Account, Profile } from "next-auth";
import type { NextRequest } from 'next/server';

// Constant test user ID to ensure consistency (must be valid UUID for Supabase)
const TEST_USER_ID = '12345678-1234-5678-9012-123456789abc';

// Function to generate a consistent UUID v5 from provider account ID
function generateUUID(providerAccountId: string | undefined, provider: string = 'google') {
  if (typeof providerAccountId !== 'string') {
    throw new Error('Invalid providerAccountId for UUID generation');
  }
  // Use different namespace UUIDs for different providers to avoid collisions
  const NAMESPACES = {
    google: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    naver: '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
  };
  
  const namespace = NAMESPACES[provider as keyof typeof NAMESPACES] || NAMESPACES.google;
  
  return crypto.createHash('sha1')
    .update(namespace + providerAccountId)
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
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      id: "test-account",
      name: "Test Account",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Test account credentials for payment testing
        if (credentials?.username === "testuser" && credentials?.password === "test123") {
          return {
            id: TEST_USER_ID,
            name: "Test User",
            email: "testuser@example.com",
            image: null,
            plan: "free", // Add the required plan property
          };
        }
        return null;
      },
    })
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
      if (account?.provider === 'test-account') {
        // For test account, always use the constant test user ID
        token.userId = TEST_USER_ID;
        console.log('🎯 JWT callback: Test account detected, setting userId:', TEST_USER_ID);
        
        // Fallback: Ensure test user exists in Supabase (in case signIn event didn't fire)
        try {
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('id', TEST_USER_ID)
            .single();
            
          if (checkError && checkError.code === 'PGRST116') {
            // User doesn't exist, create them
            console.log('🚨 Test user not found in DB, creating via JWT callback...');
            const { data: newUser, error: createError } = await supabase
              .from('users')
              .upsert({
                id: TEST_USER_ID,
                email: 'testuser@example.com',
                name: 'Test User',
                plan: 'free'
              })
              .select();
              
            if (createError) {
              console.error('❌ Failed to create test user in JWT callback:', createError);
            } else {
              console.log('✅ Successfully created test user via JWT callback:', newUser);
              
              // Also create default folder for test user
              const { error: folderError } = await supabase
                .from('folders')
                .upsert({
                  user_id: TEST_USER_ID,
                  name: 'My Folder'
                });
                
              if (folderError) {
                console.error('❌ Failed to create default folder for test user:', folderError);
              } else {
                console.log('✅ Successfully created default folder for test user');
              }
            }
          } else if (!checkError) {
            console.log('✅ Test user already exists in DB');
          }
        } catch (error) {
          console.error('❌ Error checking/creating test user:', error);
        }
      } else if (account?.providerAccountId) {
        const provider = account.provider || 'google';
        token.userId = generateUUID(account.providerAccountId, provider);
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
        console.log('🔥 SignIn event triggered! Provider:', account?.provider, 'User:', user.email);
        let userId: string;
        
        if (account?.provider === 'test-account') {
          // For test account, always use the constant test user ID
          userId = TEST_USER_ID;
          console.log('🧪 Test account sign-in detected! Using userId:', userId);
        } else if (account && typeof account.providerAccountId === 'string') {
          const provider = account.provider || 'google';
          userId = generateUUID(account.providerAccountId as string, provider);
          console.log('🔑 OAuth sign-in detected. Provider:', provider, 'Generated userId:', userId);
        } else {
          console.error('❌ No valid account provider found!', { account, user });
          throw new Error('Missing providerAccountId or test account setup');
        }
        
        // Upsert user record into Supabase with consistent UUID
        console.log('💾 Attempting to upsert user with ID:', userId, 'email:', user.email, 'name:', user.name);
        
        const { data: upsertedUser, error: userError } = await supabase.from('users').upsert({
          id: userId,
          email: user.email,
          name: user.name,
          plan: 'free' // Ensure plan is set
        }, {
          onConflict: 'id'
        }).select();
        
        if (userError) {
          console.error('❌ Supabase upsert user error:', userError.message, userError);
          console.error('Full error details:', userError);
        } else {
          console.log('✅ Successfully upserted user:', upsertedUser);
        }

        // Ensure default folder exists
        const { data: existingFolders, error: fetchErr } = await supabase
          .from('folders')
          .select('id')
          .eq('user_id', userId);
        if (fetchErr) {
          console.error('Fetch folders error:', fetchErr.message);
        } else if (!existingFolders?.length) {
          console.log('Creating default folder for user:', userId);
          const { error: folderErr } = await supabase.from('folders').insert({
            user_id: userId,
            name: 'My Folder',
          });
          if (folderErr) {
            console.error('Default folder creation failed:', folderErr.message);
          } else {
            console.log('Successfully created default folder for user:', userId);
          }
        } else {
          console.log('User already has', existingFolders.length, 'folders');
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