'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "next-auth/react";
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useDevMode } from '@/hooks/useDevMode';

export default function SignIn() {
  const t = useTranslations();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isDevMode = useDevMode();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    try {
      await signIn('email', { email, callbackUrl: '/' });
    } catch (error) {
      console.error('Email signin error:', error);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-zinc-200 bg-white p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black">{t('signIn')}</h1>
          <p className="mt-2 text-zinc-600">{t('signInDescription')}</p>
        </div>
        
        {/* Email Sign In Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading || !email}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? 'Sending...' : 'Sign in with Email'}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
          </div>
        </div>

        {/* Google Sign In */}
        <Button
          onClick={() => signIn("google")}
          className="w-full bg-black hover:bg-zinc-800 text-white"
        >
          {t('signInWithGoogle')}
        </Button>
        
        {/* Naver Sign In */}
        <Button
          onClick={() => signIn("naver")}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {t('signInWithNaver') || 'Sign in with Naver'}
        </Button>

        {/* Test Account - Only show when ?dev=true in URL */}
        {isDevMode && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">For Testing</span>
              </div>
            </div>
            
            <Button
              onClick={() => signIn("test-account", { 
                username: "testuser", 
                password: "test123",
                callbackUrl: "/" 
              })}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              🧪 Sign in with Test Account
            </Button>
            
            <div className="text-xs text-gray-500 text-center">
              Test credentials: testuser / test123
            </div>
          </>
        )}
      </div>
    </div>
  );
} 