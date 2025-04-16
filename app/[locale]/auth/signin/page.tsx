import { Button } from "@/components/ui/button";
import { signIn } from "@/auth";
import { useTranslations } from 'next-intl';

export default function SignIn() {
  const t = useTranslations();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-zinc-200 bg-white p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black">{t('signIn')}</h1>
          <p className="mt-2 text-zinc-600">{t('signInDescription')}</p>
        </div>
        <form
          action={async () => {
            "use server"
            await signIn("google")
          }}
          className="mt-8"
        >
          <Button
            type="submit"
            className="w-full bg-black hover:bg-zinc-800 text-white"
          >
            {t('signInWithGoogle')}
          </Button>
        </form>
      </div>
    </div>
  );
} 