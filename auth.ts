import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { supabase } from './lib/supabaseClient';
import crypto from 'crypto';

// Function to generate a consistent UUID v5 from Google ID
function generateUUID(googleId: string) {
  // Use a consistent namespace UUID (can be any valid UUID)
  const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  return crypto.createHash('sha1')
    .update(NAMESPACE + googleId)
    .digest('hex')
    .substring(0, 32)
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

const authOptions = {
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }: { token: any; account: any }) {
      if (account) {
        // Only set the userId when we first get the account info (during sign in)
        token.userId = generateUUID(account.providerAccountId);
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session?.user) {
        // Copy the userId from the token to the session
        session.user.id = token.userId;
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
  events: {
    async signIn({ user, account }: any) {
      try {
        // Generate consistent UUID from Google ID
        const userId = generateUUID(account.providerAccountId);
        console.log("SignIn event - generated userId:", userId); // Debug log
        
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

const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

export { authOptions, handlers, auth, signIn, signOut };
